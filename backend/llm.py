"""This file is meant to handle business logic of creating and updating chats."""
import os
import json
import time
import enum
import uuid
import base64
import openai
import requests
import tiktoken
import retrying
import tempfile
import functools

import jonlog
import db_models

logger = jonlog.getLogger()
openai.api_key = os.environ.get('OPENAI_KEY') or open(os.path.expanduser('~/.openai_key')).read().strip()
replicate_api_key = os.environ.get('REPLICATE_KEY') or open(os.path.expanduser('~/.replicate_apikey')).read().strip()
# Key loaded - DO NOT LOG API KEYS


class ChatLLMModel(enum.Enum):
    GPT3_5 = "gpt-3.5-turbo"
    GPT4  = "gpt-4-turbo-preview"

CHAT_LLM_MAX_LENGTHS = {
    ChatLLMModel.GPT3_5.value: 12_000,  # If fail, return to 4096
    ChatLLMModel.GPT4.value  : 12_000,  # 128k but lets limit for testing
}

class ChatLLM:

    def __init__(self, system, model=ChatLLMModel.GPT4.value):
        self._system = system
        self._model = model
        self._max_length = CHAT_LLM_MAX_LENGTHS[self._model]
        self._history = [
            {"role": "system", "content": self._system},
        ]
        logger.debug(f"Created ChatLLM instance with {self._model=} {self._max_length=} {system=}")

    @classmethod
    def from_hist(cls, hist, **kwargs):
        chat = ChatLLM(hist[0]["content"])
        chat._history = hist
        return chat

    @classmethod
    def num_tokens_from_text(cls, text, model=ChatLLMModel.GPT4.value):
        """Returns the number of tokens used by some text."""
        encoding = tiktoken.encoding_for_model(model)
        return len(encoding.encode(text))
    
    @classmethod
    def num_tokens_from_messages(cls, messages, model=ChatLLMModel.GPT4.value):
        """Returns the number of tokens used by a list of messages."""
        encoding = tiktoken.encoding_for_model(model)
        num_tokens = 0
        for message in messages:
            num_tokens += 4  # every message follows <im_start>{role/name}\n{content}<im_end>\n
            for key, value in message.items():
                num_tokens += len(encoding.encode(value))
                if key == "name":  # if there's a name, the role is omitted
                    num_tokens += -1  # role is always required and always 1 token
        num_tokens += 2  # every reply is primed with <im_start>assistant
        return num_tokens

    @retrying.retry(stop_max_attempt_number=5, wait_fixed=2000)
    def _msg(self, *args, model=None, **kwargs):
        if model is None:
            model = self._model
        return openai.OpenAI(api_key=openai.api_key).chat.completions.create(
            *args, model=model, messages=self._history, **kwargs
        )
    
    def message(self, msg=None, role='user', no_resp=False, **kwargs):
        while len(self._history) > 1 and self.num_tokens_from_messages(self._history) > self._max_length:
            logger.info(f'Popping message: {self._history.pop(1)}')
        if msg is not None:
            self._history.append({"role": role, "content": msg})
        if no_resp:
            return None

        req_id = str(uuid.uuid4())[:16]
        logger.info(f'requesting openai.chat {req_id=} {self._model=}...')
        resp = self._msg(**kwargs)
        logger.info(f'received openai.chat {req_id=} {self._model=}...')
        text = resp.choices[0].message.content
        self._history.append({"role": "assistant", "content": text})
        return text

    def get_history(self): return self._history


class Chat:

    def __init__(self, db, restaurant_id, user_id, force_new=False):
        self._db = db
        self._restaurant_id = restaurant_id
        self._user_id = user_id
        self._chat_db_row = db_models.get_or_create(
            db, db_models.Chat, restaurant_id=restaurant_id, user_id=user_id,
        )
        self._restaurant = self._db.query(db_models.Restaurant).get(self._restaurant_id)
        self._user = self._db.query(db_models.User).get(self._user_id)
        logger.info(f"Got {self._restaurant=} and {self._user=}")
        self._chat_llm = None
        self.start_conversation(force_new)

    @classmethod
    def from_id(cls, db, chat_id):
        chat_db_row = db.query(db_models.Chat).get(chat_id)
        return cls(db, chat_db_row.restaurant_id, chat_db_row.user_id)
    
    @classmethod
    def get_user_pref_msg(cls, user):
        allergies   = sorted([x for x in user.dietary_restrictions if x.restriction_type == 'allergy'], key=lambda p: p.level, reverse=True)
        preferences = sorted([x for x in user.dietary_restrictions if x.restriction_type == 'preference'], key=lambda p: p.level, reverse=True)

        prefs = [f'You are talking to me, {user.name}.']
        if user.bio:
            prefs.append(f'Here is a bio about me: ```{user.bio}```')

        if allergies:
            prefs.append(f"# My ({user.name}) Allergies:")
            for allergy in allergies:
                prefs.append(f"- {allergy.ingredient}")

        if preferences:
            prefs.append(f"""# My ({user.name}) Preferences:
Each preference includes a number on the scale 1 to -1.
1 means always recommend dishes with this ingredient.
-1 means absolutely never recommend this ingredient, it is be deadly for me.
""")
            pref_text = lambda pref: f"- ({pref.level}) {pref.ingredient}."

            ridx = 0
            for name, limit in [('Love', 0.7), ('Like', 0), ('Dislike', -0.7), ('Hate', float('-inf'))]:
                while ridx < len(preferences) and preferences[ridx].level > limit:
                    if f'## {name}:' not in prefs:
                        prefs.append(f'## {name}:')
                    prefs.append(pref_text(preferences[ridx]))
                    ridx += 1
        
        system_msg = """
Given my dietary preferences and allergies, write the full detailed list of rules to follow when recommending food and drinks for me.
Remember this can be life or death, so be specific and detailed.
Write in an organized markdown format.
Write as many rules as you need.
"""
        pref_msg = '\n'.join(prefs)
        _chat_llm = ChatLLM(system_msg, model='gpt-3.5-turbo')
        return _chat_llm.message(msg=pref_msg, model='gpt-3.5-turbo')
    
    @classmethod
    def rewrite_systemprompt_for_user(cls, db, user_id):
        user = db.query(db_models.User).get(user_id)
        user.preference_message = cls.get_user_pref_msg(user)
        db_models.transact(db)

        for chat_db_row in db.query(db_models.Chat).filter_by(user_id=user_id).all():
            obj = cls(db, chat_db_row.restaurant_id, chat_db_row.user_id)
            llm_system = obj.make_system(obj._user, obj._restaurant_id)
            obj._chat_llm._history[0]["content"] = llm_system
            obj.save()

    def save(self):
        self._chat_db_row.conversation_data = db_models.Chat.serialize_msgs(self._chat_llm.get_history())
        self._db.add(self._chat_db_row)
        db_models.transact(self._db)

    def get_db_row(self): return self._chat_db_row

    @classmethod
    def make_system(cls, user, restaurant_id):
        reviews = [rev for rev in user.reviews if rev.restaurant_id == restaurant_id]
        system = [
            f'You are talking to me, {user.name}.',
            user.preference_message or "",
        ]

        if reviews:
            system.append("# My Menu Reviews")
            for rev in reviews:
                system.append(f"- {rev.rating}/5 `{rev.item}` ```{rev.review_text}```")
        
        system.append(f"""# Respond
Return recommendations from the menu in a few categories, making sure to use fancy markdown formatting.
ALWAYS bold the menu items in markdown.
NEVER bold anything else.
Assume I always want an appetizer, main course, and dessert.
""")

        # TODO: Add restaurant biases/specials into system.
        return '\n'.join(system)

    @classmethod
    def make_restaurant_msg(cls, restaurant):
        msg = [f"""# Restaurant {restaurant.name}'s Documents
## Menu
```"""]
        msg.extend([menu.menu_data.replace('```', '') for menu in restaurant.menus])
        msg.append('```\n')
        for doc in restaurant.documents:
            msg.append(f"""## {doc.document_type}
```""")
            msg.append(doc.document_data)
            msg.append('```\n')
        return "\n".join(msg)


    def start_conversation(self, force_new):
        if self._chat_llm is not None and not force_new:
            raise Exception("Cannot overwrite existing chat.")

        if self._chat_db_row.conversation_data and not force_new:
            self._chat_llm = ChatLLM.from_hist(db_models.Chat.deserialize_msgs(self._chat_db_row.conversation_data))
        else:
            # Create chat_llm obj
            llm_system = self.make_system(self._user, self._restaurant_id)
            self._chat_llm = ChatLLM(llm_system)

            # Send menu
            self._chat_llm.message(msg=self.make_restaurant_msg(self._restaurant), role='system', no_resp=True)
            self._chat_llm.message(msg='How can I help you? 😃', role='assistant', no_resp=True)
            self.save()

    def message(self, *args, save=True, **kwargs):
        resp = self._chat_llm.message(*args, **kwargs)
        if save: 
            self.save()
        return resp

class SpeechToText:
    def __init__(self, model='whisper-1'):
        self._model = model
    
    def transcribe(self, audio_file):
        req_id = str(uuid.uuid4())[:16]
        logger.info(f"Requesting openai.{self._model} with {req_id=}")
        with tempfile.TemporaryDirectory() as tmpdir:
            file_path = f'{tmpdir}/audio.mp4'
            with open(file_path, 'wb') as f:
                f.write(audio_file.read())
            with open(file_path, 'rb') as f:
                transcript = openai.OpenAI(api_key=openai.api_key).audio.transcriptions.create(
                    model="whisper-1",
                    file=f,
                    response_format='text',
                )
        logger.info(f"Received openai.{self._model} with {req_id=} {transcript=}")
        return transcript


class Image:
    SIZE = {
        "DALLE2_SMALL": "256x256",
        "DALLE2_MEDIUM": "512x512",
        "DALLE2_LARGE": "1024x1024",
        "DALLE3_SQUARE": "1024x1024",
        "DALLE3_HORIZONTAL": "1024x1024",
        "FOFR_MEDIUM": "512x512",
        "FOFR_HORIZONTAL": "960x480",
    }
    MODEL = {
        "2": "dall-e-2",
        "3": "dall-e-3",
        "fofr": "fofr",
    }

    @classmethod
    def create(cls, prompt, n=1, response_format="url", model=MODEL["fofr"], size=SIZE["FOFR_MEDIUM"]):
        logger.info(f'requesting Image with prompt={prompt}, n={n}, response_format={response_format}, model={model}, size={size}...')
        if model.startswith("dall-e"):
            resp = openai.OpenAI(api_key=openai.api_key).images.generate(prompt=prompt, n=n, size=size, model=model, response_format=response_format, timeout=45)
            resp = resp.data
        else:
            width, height = size.split('x')
            width, height = int(width), int(height)
            resp = requests.post(
                "https://api.replicate.com/v1/predictions",
                headers={"Content-Type": "application/json", "Authorization": f"Token {replicate_api_key}"},
                json={"version": "a83d4056c205f4f62ae2d19f73b04881db59ce8b81154d314dd34ab7babaa0f1", "input": {
                    "prompt": prompt,
                    "width": width, "height": height,
                    "num_images": n,
                }},
            )
            resp = resp.json()
            sleeps = 0
            while resp.get("status", "fail").lower() not in {"fail", "succeeded"}:
                if sleeps >= 10:
                    raise Exception('Error generating image', resp)
                logger.info(f"Sleeping 1...")
                time.sleep(1)
                sleeps += 1
                resp = requests.get(f"https://api.replicate.com/v1/predictions/{resp['id']}", headers={"Content-Type": "application/json", "Authorization": f"Token {replicate_api_key}"})
                resp = resp.json()
                
        logger.info('received Image...')
        return resp
class FastImage:

    @classmethod
    def generate(cls, prompt, size='768x512', **kwargs):
        data = Image.create(prompt, model='fofr', size=size, **kwargs)
        url = data['output'][0]
        # Get the MIME type of the image (e.g., 'image/jpeg', 'image/png')
        mime_type = f"image/{url.rsplit('.', 1)[-1]}"
        # Encode to base64 and format as a data URI
        return f"data:{mime_type};base64," + base64.b64encode(requests.get(url).content).decode()

    @classmethod
    @functools.lru_cache(maxsize=120)
    def generate_food(cls, dish_name, prompt_template='DSLR photo of {dish_name} served in a restaurant, award-winning, realistic, delicious, 8k resolution'):
        return cls.generate(prompt_template.format(dish_name=dish_name))

