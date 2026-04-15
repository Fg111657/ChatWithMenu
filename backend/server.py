import argparse
import os
import re
import yaml
import json
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from flask import Flask, render_template, request, send_from_directory, Response, jsonify
from flask_cors import CORS
from flask_restx import Api, Resource, reqparse, fields, Namespace
from sqlalchemy.orm import sessionmaker

import jonlog
import db_models
import google_places_helper
import llm
import invite_codes
from auth_middleware import require_auth
import user_helpers
import rate_limiter
from constants import (
    ALLOWED_QUESTION_TEMPLATES, ALLOWED_QUESTION_STATUS, ALLOWED_VISIBILITY, MAX_TABLE_MEMBERS,
    ALLOWED_REPORT_TYPES, ALLOWED_TARGET_TYPES, ALLOWED_REPORT_STATUS,
    ALLOWED_VERIFICATION_STATES, ALLOWED_EVIDENCE_TYPES
)

logger = jonlog.getLogger()
parser = argparse.ArgumentParser()
parser.add_argument('--env', default='dev')
args = parser.parse_args()
# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
    logger.info("Loaded .env file for Google API keys")
except ImportError:
    logger.warning("python-dotenv not installed, skipping .env loading")
except Exception as e:
    logger.warning(f"Could not load .env: {e}")
logger.info(f'Starting with {args=}')

# Create the Flask application
app = Flask(__name__, static_folder='/var/www/chatwithmenu/FrontendReact/build')
CORS(app)

# try:
#     if args.env != 'prod': raise Exception()
#     with open(os.path.expanduser('~/.supabase'), 'r') as f:
#         db_cfg = yaml.safe_load(f)
#     connection_string = f'postgresql://{db_cfg["user"]}:{db_cfg["pass"]}@{db_cfg["host"]}:{db_cfg["port"]}/{db_cfg["name"]}'
#     logger.info(connection_string)
# except Exception as e:
#     logger.warning(f'Got exception trying to connect to supabase', exc_info=True)
connection_string = 'sqlite:///localdata.db'
app.config['SQLALCHEMY_DATABASE_URI'] = connection_string
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Setup database
engine = create_engine(app.config['SQLALCHEMY_DATABASE_URI'],
    pool_size=100,  # The number of connections to keep open inside the connection pool
    max_overflow=50,  # The number of connections that can be created above `pool_size` if necessary
)
db_models.Base.metadata.bind = engine
db_models.create_all(engine)
DBSession = sessionmaker(bind=engine)
_db = DBSession()

class GetDB:
    def __enter__(self, *args, **kwargs):
        global _db
        print("Entered", flush=True)
        try:
            _db.query(db_models.Restaurant).get(0)
        except:
            print("Recreating session", flush=True)
            try:
                _db.close()
            except:
                try:
                    _db.rollback()
                    _db.close()
                except:
                    print("OOps cannot close lmao", flush=True)
            _db = DBSession()
        print("Entered", flush=True)
        return _db
    def __exit__(self, *args, **kwargs):
        print("Exiting", flush=True)

# Setup Flask-Restx and Swagger
api = Api(
    app,
    version='1.0',
    title='ChatWithMenu API',
    doc='/apidocs',
    description='A simple API for ChatWithMenu'
)
api_namespace = Namespace('api', description='API operations', path='/api')


# Health Check Endpoint (no auth required)
@api_namespace.route('/health')
class HealthCheck(Resource):
    def get(self):
        """
        Health check endpoint for monitoring.

        Returns server status, database connectivity, and basic metrics.
        No authentication required.
        """
        try:
            with GetDB() as db:
                # Test database connection
                db.query(db_models.Restaurant).first()
                db_status = 'connected'
        except Exception as e:
            db_status = f'error: {str(e)}'

        # Get table counts
        table_counts = {}
        try:
            with GetDB() as db:
                table_counts = {
                    'restaurants': db.query(db_models.Restaurant).count(),
                    'users': db.query(db_models.User).count(),
                    'table_connections': db.query(db_models.TableConnection).count(),
                    'table_questions': db.query(db_models.TableQuestion).count(),
                    'table_answers': db.query(db_models.TableAnswer).count(),
                    'safety_signals': db.query(db_models.SafetySignal).count(),
                }
        except Exception as e:
            logger.warning(f"Could not fetch table counts: {e}")

        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'database': db_status,
            'api_version': '1.0',
            'my_table_enabled': True,
            'endpoints': {
                'total': 18,
                'table_connections': 4,
                'questions_answers': 7,
                'safety_signals': 4,
                'discovery_abuse': 3,
            },
            'table_counts': table_counts,
        })


@api_namespace.route('/restaurant/<int:restaurant_id>')
class RestaurantResource(Resource):
    def get(self, restaurant_id):
        restaurant_id = int(restaurant_id)
        with GetDB() as db:
            restaurant = db.query(db_models.Restaurant).get(restaurant_id)
            if restaurant is None:
                api.abort(404, "Restaurant not found")

            # Parse menu_data from JSON string to object
            menus_parsed = []
            for menu in restaurant.menus:
                try:
                    menu_data_obj = json.loads(menu.menu_data) if menu.menu_data else {}
                except (json.JSONDecodeError, TypeError):
                    menu_data_obj = {}
                menus_parsed.append({"id": menu.id, "menu_data": menu_data_obj})

            return jsonify({
                "id": restaurant.id,
                "user_id": restaurant.user_id,
                "name": restaurant.name,
                "menus": menus_parsed,
                "documents": [
                    {"id": doc.id, "document_type": doc.document_type, "document_data": doc.document_data}
                    for doc in restaurant.documents
                ]
            })
        
    def delete(self, restaurant_id):
        restaurant_id = int(restaurant_id)
        with GetDB() as db:
            restaurant = db.query(db_models.Restaurant).get(restaurant_id)
            if restaurant is None:
                api.abort(404, "Restaurant not found")
            user_id = request.json.get('user_id')
            user = db.query(db_models.User).get(user_id)
            if restaurant.user_id != user_id and (user is None or user.account_type != 1):
                print(user_id, user)
                api.abort(401, "Only authorized users can do this.")
            for menu in restaurant.menus:
                db.delete(menu)
            for doc in restaurant.documents:
                db.delete(doc)
            db.delete(restaurant)
            db_models.transact(db)

            try:
                restaurants = db.query(db_models.Restaurant)
                if user_id is not None:
                    # If user is admin, return all
                    user = db.query(db_models.User).get(user_id)
                    if user is None:
                        api.abort(404, "User not found")
                    if user.account_type != 1:
                        restaurants = restaurants.filter_by(user_id=user_id)
                restaurants = restaurants.all()
            except Exception as e:
                api_namespace.abort(500, str(e))
            return db_models.create_marshmallow_schema(db_models.Restaurant, many=True).dump(restaurants)
        
@api_namespace.route('/restaurant')
class CreateRestaurantResource(Resource):
    def post(self):
        with GetDB() as db:
            # Assume request.json looks like this:
            # {"restaurant": {"name": ...}, "menus": [...], "documents": ...}
            if 'restaurant' not in request.json or 'menus' not in request.json:
                api.abort(400, "restaurant or menus key missing in request.")

            restaurant = db_models.Restaurant(**request.json["restaurant"])
            db.add(restaurant)
            db_models.transact(db)
            menus = [db_models.MenuDetail(**menu_data, restaurant_id=restaurant.id) for menu_data in request.json["menus"]]
            documents = [db_models.RestaurantDocument(**doc_data, restaurant_id=restaurant.id) for doc_data in request.json["documents"]]
            for menu in menus:
                db.add(menu)
            for doc in documents:
                db.add(doc)
            db_models.transact(db)


@api_namespace.route('/restaurant/<int:restaurant_id>/<document_type>')
class CreateRestaurantDocumentResource(Resource):
    def post(self, restaurant_id, document_type):
        with GetDB() as db:
            # Verify restaurant exists
            restaurant = db.query(db_models.Restaurant).get(restaurant_id)
            if restaurant is None:
                api.abort(404, "Restaurant not found")
            # Verify document type is okay
            # Now we can create it!
            if document_type == 'menu':
                document = db_models.MenuDetail(**request.json)
            elif document_type == 'document':
                document = db_models.RestaurantDocument(**request.json)
            else:
                api.abort(400, "Document type must be menu or document.")
            db.add(document)
            db_models.transact(db)

@api_namespace.route('/restaurant/<int:restaurant_id>/<document_type>/<int:document_id>')
class RestaurantDocumentResource(Resource):
    def _get_doc(self, restaurant_id, document_type, document_id):
        with GetDB() as db:
            # Verify restaurant exists
            restaurant = db.query(db_models.Restaurant).get(restaurant_id)
            if restaurant is None:
                api.abort(404, "Restaurant not found")
            # Verify document exists
            if document_type == 'menu':
                docs = restaurant.menus
            elif document_type == 'document':
                docs = restaurant.documents
            else:
                api.abort(400, "Document type must be menu or document.")
            matching_doc = None
            for doc in docs:
                if doc.id == document_id:
                    matching_doc = doc
            if matching_doc is None:
                api.abort(404, "Document not found")
            return matching_doc

    def post(self, restaurant_id, document_type, document_id):
        with GetDB() as db:
            document = self._get_doc(restaurant_id, document_type, document_id)
            document_data = request.json['document_data']
            for key, val in document_data.items():
                setattr(document, key, val)
            db_models.transact(db)

    def delete(self, restaurant_id, document_type, document_id):
        with GetDB() as db:
            document = self._get_doc(restaurant_id, document_type, document_id)
            db.delete(document)
            db_models.transact(db)

# PUBLIC: Read cached Google data (no auth, no API calls)
@api_namespace.route('/restaurant/<int:restaurant_id>/google_cached')
class RestaurantGoogleCached(Resource):
    def get(self, restaurant_id):
        """Get cached Google Places data (public, read-only, no API calls)"""
        with GetDB() as db:
            restaurant = db.query(db_models.Restaurant).get(restaurant_id)
            if not restaurant:
                return {'error': 'Restaurant not found'}, 404

            # Return cached data only (never triggers Google API)
            if not restaurant.google_place_id:
                return {'google': None}

            return {
                'google': {
                    'place_id': restaurant.google_place_id,
                    'rating': restaurant.google_rating,
                    'user_ratings_total': restaurant.google_user_ratings_total,
                    'address': restaurant.google_address,
                    'phone': restaurant.google_phone,
                    'website': restaurant.google_website,
                    'photo_refs': json.loads(restaurant.google_photo_refs) if restaurant.google_photo_refs else [],
                    'enriched_at': restaurant.google_enriched_at.isoformat() if restaurant.google_enriched_at else None
                }
            }

# PROTECTED: Trigger Google enrichment (auth required, can call Google API)
@api_namespace.route('/restaurant/<int:restaurant_id>/enrich_google')
class RestaurantGoogleEnrich(Resource):
    @api_namespace.doc(params={'force': 'Set to 1 to force refresh even if cached data is fresh'})
    def post(self, restaurant_id):
        """Enrich restaurant with Google Places data (30-day TTL cache, AUTH REQUIRED)"""
        force = request.args.get('force', '0') == '1'
        with GetDB() as db:
            restaurant = db.query(db_models.Restaurant).get(restaurant_id)
            if not restaurant:
                return {'error': 'Restaurant not found'}, 404

            needs_refresh = force or not restaurant.google_place_id or not google_places_helper.is_fresh(restaurant.google_enriched_at)

            if not needs_refresh:
                # Return cached data
                return {
                    'ok': True,
                    'source': 'cache',
                    'cached_days_ago': (datetime.now() - restaurant.google_enriched_at).days if restaurant.google_enriched_at else None,
                    'google': {
                        'place_id': restaurant.google_place_id,
                        'rating': restaurant.google_rating,
                        'user_ratings_total': restaurant.google_user_ratings_total,
                        'address': restaurant.google_address,
                        'phone': restaurant.google_phone,
                        'website': restaurant.google_website,
                        'photo_refs': json.loads(restaurant.google_photo_refs) if restaurant.google_photo_refs else []
                    }
                }

            # Call Google API (use restaurant.address for new restaurants, not google_address which may be null)
            try:
                google_data = google_places_helper.lookup_google_places(name=restaurant.name, address=restaurant.address)
                if not google_data:
                    return {'error': 'Restaurant not found on Google Places'}, 404

                # Update database
                restaurant.google_place_id = google_data['place_id']
                restaurant.google_rating = google_data['rating']
                restaurant.google_user_ratings_total = google_data['user_ratings_total']
                restaurant.google_address = google_data['address']
                restaurant.google_phone = google_data['phone']
                restaurant.google_website = google_data['website']
                restaurant.google_photo_refs = json.dumps(google_data['photo_refs'])
                restaurant.google_raw = json.dumps(google_data['raw'])
                restaurant.google_enriched_at = datetime.now()
                db_models.transact(db)

                return {
                    'ok': True,
                    'source': 'google',
                    'google': {
                        'place_id': google_data['place_id'],
                        'rating': google_data['rating'],
                        'user_ratings_total': google_data['user_ratings_total'],
                        'address': google_data['address'],
                        'phone': google_data['phone'],
                        'website': google_data['website'],
                        'photo_refs': google_data['photo_refs']
                    }
                }
            except Exception as e:
                logger.error(f"Google Places API error: {e}", exc_info=True)
                return {'error': f'Google API error: {str(e)}'}, 500

@api_namespace.route('/restaurant/<int:restaurant_id>/photo/<int:photo_index>')
class RestaurantPhotoProxy(Resource):
    def get(self, restaurant_id, photo_index):
        """Proxy Google Photos without exposing API key (public)"""
        with GetDB() as db:
            restaurant = db.query(db_models.Restaurant).get(restaurant_id)
            if not restaurant or not restaurant.google_photo_refs:
                api.abort(404, "Restaurant or photos not found")
            if not restaurant.google_place_id:
                api.abort(404, "Restaurant has no Google place ID")
            # Use new Places API v1 (old photo_reference format no longer works)
            content_bytes, content_type = google_places_helper.get_v1_photo_content(
                restaurant.google_place_id, photo_index, max_width=800
            )
            if content_bytes is None:
                logger.error(f"Photo proxy: failed for restaurant {restaurant_id} index {photo_index}")
                api.abort(500, "Failed to fetch photo from Google")
            return Response(content_bytes, mimetype=content_type or 'image/jpeg',
                          headers={'Cache-Control': 'public, max-age=86400',
                                   'Content-Type': content_type or 'image/jpeg'})


@api_namespace.route('/listRestaurants')
class ListRestaurantsResource(Resource):
    @api_namespace.doc(params={
        'user_id': 'Optional user_id restriction',
        'search': 'Search by restaurant name (partial match)',
        'cuisine': 'Filter by cuisine type (exact match)',
        'dietary': 'Filter by dietary tags (comma-separated, must have all)',
        'sort': 'Sort by: name (default), rating',
        'page': 'Page number (default 1)',
        'per_page': 'Results per page (default 20, max 50)'
    })
    def get(self):
        with GetDB() as db:
            # Get query parameters
            user_id = request.args.get('user_id', default=None)
            search = request.args.get('search', default='', type=str)
            cuisine = request.args.get('cuisine', default=None, type=str)
            dietary = request.args.get('dietary', default='', type=str)
            sort_by = request.args.get('sort', default='name', type=str)
            page = max(1, request.args.get('page', default=1, type=int))
            per_page = min(50, max(1, request.args.get('per_page', default=20, type=int)))

            try:
                # Start with base query
                query = db.query(db_models.Restaurant)

                # User restriction filter
                if user_id is not None:
                    user = db.query(db_models.User).get(user_id)
                    if user is None:
                        api.abort(404, "User not found")
                    if user.account_type != 1:  # Not admin
                        query = query.filter_by(user_id=user_id)

                # Search filter (case-insensitive partial match)
                if search:
                    query = query.filter(db_models.Restaurant.name.ilike(f'%{search}%'))

                # Cuisine filter (exact match, case-insensitive)
                if cuisine and cuisine.lower() != 'all':
                    query = query.filter(db_models.Restaurant.cuisine_type.ilike(cuisine))

                # Dietary tags filter (must have all specified tags)
                if dietary:
                    dietary_tags = [tag.strip() for tag in dietary.split(',') if tag.strip()]
                    for tag in dietary_tags:
                        # Check if dietary_tags JSON contains the tag
                        query = query.filter(db_models.Restaurant.dietary_tags.like(f'%{tag}%'))

                # Count total before pagination
                total = query.count()

                # Sorting
                if sort_by == 'rating':
                    # Sort by rating_aggregate descending, nulls last
                    query = query.order_by(
                        db_models.Restaurant.rating_aggregate.desc().nullslast(),
                        db_models.Restaurant.name.asc()
                    )
                else:  # Default: sort by name (alphabetical)
                    query = query.order_by(db_models.Restaurant.name.asc())

                # Pagination
                offset = (page - 1) * per_page
                query = query.limit(per_page).offset(offset)

                # Execute query
                restaurants = query.all()

                # Enrich with calculated ratings (if not already cached in DB)
                for restaurant in restaurants:
                    if restaurant.rating_aggregate is None or restaurant.review_count is None:
                        # Calculate from reviews
                        reviews = db.query(db_models.Review).filter_by(restaurant_id=restaurant.id).all()
                        if reviews:
                            avg_rating = sum(r.rating for r in reviews) / len(reviews)
                            restaurant.rating_aggregate = round(avg_rating, 1)
                            restaurant.review_count = len(reviews)
                        else:
                            restaurant.rating_aggregate = 0.0
                            restaurant.review_count = 0

                # Serialize response manually to include all fields
                restaurants_data = [{
                    "id": r.id,
                    "name": r.name,
                    "user_id": r.user_id,
                    "address": r.address,
                    "description": r.description,
                    "cuisine_type": r.cuisine_type,
                    "dietary_tags": r.dietary_tags,  # CRITICAL: Needed for allergy/dietary filter chips
                    "rating_aggregate": r.rating_aggregate,
                    "review_count": r.review_count,
                    "phone": r.phone,
                    "price_range": r.price_range,
                    "amenities": r.amenities,
                    "latitude": r.latitude,
                    "longitude": r.longitude,
                    "hours_json": r.hours_json,
                } for r in restaurants]

                return {
                    'restaurants': restaurants_data,
                    'total': total,
                    'page': page,
                    'per_page': per_page,
                    'total_pages': (total + per_page - 1) // per_page
                }

            except Exception as e:
                logger.error(f"Error in listRestaurants: {str(e)}", exc_info=True)
                api_namespace.abort(500, str(e))

@api_namespace.route('/loadUser/<int:user_id>')
class LoadUser(Resource):
    def get(self, user_id):
        user_id = int(user_id)
        with GetDB() as db:
            user = db.query(db_models.User).get(user_id)
            if user is None:
                api.abort(404, "User not found")
            return db_models.create_marshmallow_schema(db_models.User, include_foreign=True).dump(user)

@api_namespace.route('/modifyUser/<int:user_id>')
class ModifyUser(Resource):
    def post(self, user_id):
        user_id = int(user_id)
        with GetDB() as db:
            user = db.query(db_models.User).get(user_id)
            if user is None:
                api.abort(404, "User not found")
            user_data = request.json['user_data']
            if 'account_type' in user_data and user_data['account_type'] == 1 and user.account_type != 1:
                api.abort(403, "You cannot make yourself an admin.")
            for key, val in user_data.items():
                setattr(user, key, val)
            db_models.transact(db)
            llm.Chat.rewrite_systemprompt_for_user(db, user_id)
            return db_models.create_marshmallow_schema(db_models.User, include_foreign=True).dump(user)

@api_namespace.route('/loadUserPreferences/<int:user_id>/<restriction_type>')
class LoadUserPreferences(Resource):
    def get(self, user_id, restriction_type):
        user_id = int(user_id)
        with GetDB() as db:
            user = db.query(db_models.User).get(user_id)
            if user is None:
                api.abort(404, "User not found")
            prefs = [p for p in user.dietary_restrictions if p.restriction_type == restriction_type]
            return db_models.create_marshmallow_schema(db_models.DietaryRestriction, many=True).dump(prefs)

@api_namespace.route('/saveUserPreferences/<int:user_id>/<restriction_type>')
class SaveUserPreferences(Resource):
    def post(self, user_id, restriction_type):
        user_id = int(user_id)
        with GetDB() as db:
            new_prefs = request.json['dietary_restrictions']
            existing_prefs = db.query(db_models.DietaryRestriction).filter_by(user_id=user_id).filter_by(restriction_type=restriction_type).all()
            for pref in new_prefs:
                new_pref = db_models.DietaryRestriction(
                    user_id=user_id,
                    ingredient=pref['ingredient'],
                    level=pref.get('level', -1 if restriction_type == 'allergy' else 0),
                    restriction_type=restriction_type,
                )
                db.add(new_pref)
            for pref in existing_prefs:
                db.delete(pref)
            db_models.transact(db)
            llm.Chat.rewrite_systemprompt_for_user(db, user_id)

@api_namespace.route('/saveUserPreferencesAudio/<int:user_id>')
class SaveUserPreferencesAudio(Resource):
    def post(self, user_id):
        db = _db
        # Load audio file
        print(request.files)
        audio_file = request.files['audio_file']
        print(audio_file)

        # Transcribe audio file
        text = llm.SpeechToText().transcribe(audio_file)

        # Ask ChatGPT to re-create the dietary restriction objects from file
        chat = llm.ChatLLM("""
Given existing user preferences, and some text the user wrote, create new JSON that consolidates all information.
Output JSON format:
{
    "preferences": [
        {"ingredient": "...", "restriction_type": "...", "level": ...(float between -1.0 and 1.0)},
    ]
}
Each preference includes "level" on the scale 1 to -1.
1 means I really like this ingredient.
-1 means I hate this ingredient.

"restriction_type" can be "allergy" or "preference".
""")
        existing_prefs = db.query(db_models.DietaryRestriction).filter_by(user_id=user_id).all()
        existing_prefs_str = "[" + ", ".join([
            f'{{"ingredient": "{pref.ingredient}", "restriction_type": "{pref.restriction_type}", "level": "{pref.level}"}}'
            for pref in existing_prefs
            ]) + "]"
        new_prefs_json = chat.message(msg=f"""
Existing preferences: {{"preferences": {existing_prefs_str} }}
New info:
{text}
""", response_format={ "type": "json_object" })
        logger.info(f"Got back {new_prefs_json}")
        new_prefs = json.loads(new_prefs_json)["preferences"]
        
        for pref in existing_prefs:
            db.delete(pref)
        for pref in new_prefs:
            new_pref = db_models.DietaryRestriction(
                user_id=user_id,
                ingredient=pref['ingredient'],
                level=pref['level'],
                restriction_type=pref['restriction_type']
            )
            db.add(new_pref)
        db_models.transact(db)
        llm.Chat.rewrite_systemprompt_for_user(db, user_id)
        return new_prefs


@api_namespace.route('/startChat')
class StartChat(Resource):
    @api.expect(api.model('StartChatModel', {
        'restaurant_id': fields.Integer(required=True, description='The restaurant ID'),
        'user_id': fields.Integer(required=True, description='The user ID'),
        'force_new': fields.Boolean(required=False, default=False, description='Force a new chat.')
    }))
    def post(self):
        rid = int(api.payload['restaurant_id'])
        uid = int(api.payload['user_id'])
        with GetDB() as db:
            chat = llm.Chat(db, rid, uid, force_new=api.payload.get('force_new', False))
            resp = chat.get_db_row()
            return db_models.create_marshmallow_schema(db_models.Chat).dump(resp)

@api_namespace.route('/sendMessage')
class SendMessage(Resource):
    @api.expect(api.model('SendMessageModel', {
        'chat_id': fields.Integer(required=True, description='The chat ID'),
        'message': fields.String(required=True, description='The message to send'),
    }))
    def post(self):
        with GetDB() as db:
            chat = llm.Chat.from_id(db, api.payload['chat_id'])
            resp = chat.message(msg=api.payload['message'])
            return {"response": {"role": "assistant", "content": resp}}

@api_namespace.route('/submitReview')
class SubmitReview(Resource):
    @api.expect(api.model('CreateUserModel', {
        'user_id': fields.Integer(required=True),
        'restaurant_id': fields.Integer(required=True),
        'chat_id': fields.Integer(required=True),
        'item': fields.String(required=True),
        'rating': fields.Integer(required=True, description='1-5'),
        'review_text': fields.String(required=False),
    }))
    def post(self):
        with GetDB() as db:
            rev = db_models.Review(
                user_id=api.payload['user_id'],
                restaurant_id=api.payload['restaurant_id'],
                chat_id=api.payload['chat_id'],
                item=api.payload['item'],
                rating=api.payload['rating'],
                review_text=api.payload['review_text'],
            )
            db.add(rev)
            db_models.transact(db)
            llm.Chat.rewrite_systemprompt_for_user(db, api.payload['user_id'])
            return db_models.create_marshmallow_schema(db_models.Review).dump(rev)

@api_namespace.route('/createUser')
class CreateUser(Resource):
    @api.expect(api.model('CreateUserModel', {
        'email': fields.String(required=True, description='The Users email'),
        'name': fields.String(required=True, description='The user name.'),
        'password': fields.String(required=True, description='The user password.'),
        'invite_code': fields.String(required=False, description='Invite code for access control'),
    }))
    def post(self):
        with GetDB() as db:
            # RALPH FIX 01: Block invalid codes; empty code = customer account
            code = (api.payload.get('invite_code') or '').strip()
            if code and not invite_codes.is_valid_invite_code(code):
                api.abort(403, 'Invalid invite code.')
            if db.query(db_models.User).filter_by(email=api.payload['email']).first() is not None:
                api.abort(400, "User with email already exists.")
            user = db_models.User(
                email=api.payload['email'],
                name=api.payload['name'],
            )
            user.set_password(api.payload['password'])
            if code:
                user.account_type = invite_codes.get_account_type_from_code(code)
            db.add(user)
            db_models.transact(db)
            if code:
                invite_codes.consume_invite_code(code)
            llm.Chat.rewrite_systemprompt_for_user(db, user.id)
            return db_models.create_marshmallow_schema(db_models.User).dump(user)

@api_namespace.route('/getOrCreateUser')
class GetOrCreateUser(Resource):
    @api.expect(api.model('GetOrCreateUserModel', {
        'email': fields.String(required=True, description='The Users email'),
        'name': fields.String(required=True, description='The user name.'),
        'password': fields.String(required=True, description='The user password.'),
        'bio': fields.String(required=False, description='The user bio.'),
        'invite_code': fields.String(required=False, description='Invite code for access control'),
    }))
    def post(self):
        with GetDB() as db:
            if db.query(db_models.User).filter_by(email=api.payload['email']).first() is not None:
                user = db.query(db_models.User).filter_by(email=api.payload['email']).first()
                if api.payload.get('bio'):
                    user.bio = api.payload.get('bio')
                    db_models.transact(db)
                return db_models.create_marshmallow_schema(db_models.User).dump(user)
            # RALPH FIX 01b: Block invalid codes; empty code = customer account
            code = (api.payload.get('invite_code') or '').strip()
            if code and not invite_codes.is_valid_invite_code(code):
                api.abort(403, 'Invalid invite code.')
            user = db_models.User(
                email=api.payload['email'],
                name=api.payload['name'],
                bio=api.payload.get('bio', 'A hungry hippo or person. Guess which one!')
            )
            user.set_password(api.payload['password'])
            user.account_type = invite_codes.get_account_type_from_code(code)
            db.add(user)
            db_models.transact(db)
            invite_codes.consume_invite_code(code)
            llm.Chat.rewrite_systemprompt_for_user(db, user.id)
            return db_models.create_marshmallow_schema(db_models.User).dump(user)

@api_namespace.route('/loginUser')
class LoginUser(Resource):
    @api.expect(api.model('LoginUserModel', {
        'email': fields.String(required=True, description='The Users email'),
        'password': fields.String(required=True, description='The user password.'),
    }))
    def post(self):
        with GetDB() as db:
            try:
                user = db.query(db_models.User).filter_by(email=api.payload['email']).first()
            except:
                api_namespace.abort(404, "User with email does not exist.")
            if not user.check_password(api.payload['password']):
                api_namespace.abort(400, "Password is incorrect.")
            return db_models.create_marshmallow_schema(db_models.User).dump(user)

@api_namespace.route('/reviews/<int:user_id>/<int:restaurant_id>')
class UserRestaurantReviews(Resource):
    def get(self, user_id, restaurant_id):
        with GetDB() as db:
            try:
                # Load user or 404
                user = db.query(db_models.User).get(user_id)
            except:
                api_namespace.abort(404, "User with ID does not exist.")
            # Filter user reviews by restaurant id and then return 
            reviews = [rev for rev in user.reviews if rev.restaurant_id == restaurant_id]
            return db_models.create_marshmallow_schema(db_models.Review, many=True).dump(reviews)

    def post(self, user_id, restaurant_id):
        with GetDB() as db:
            # Load submitted reviews
            new_reviews = request.json['reviews']
            # Save changes (if any)
            for rev in new_reviews:
                rev.pop('datetime', None)
                db.merge(db_models.Review(**rev))
            db_models.transact(db)
            llm.Chat.rewrite_systemprompt_for_user(db, user_id)

@api_namespace.route('/imagegen/dish/<int:restaurant_id>/<dish_name>', strict_slashes=False)
class ImageGenerator(Resource):
    def get(self, restaurant_id, dish_name):
        with GetDB() as db:
            # Look up in DB if restaurant + image exists
            clean_dish_name = re.sub('[^a-z]', '', dish_name.lower())
            img = db.query(db_models.DishImage).filter_by(restaurant_id=restaurant_id, dish_name=clean_dish_name).first()
            if img is None:
                img_base64 = llm.FastImage.generate_food(dish_name)
            else:
                img_base64 = img.image_base64
            return {"img_base64": img_base64}

@api_namespace.route('/chat/<int:chat_id>/menu_items')
class MenuItemFromChat(Resource):
    def get(self, chat_id):
        with GetDB() as db:
            #load the chat ask the chat for list of menu items
            chat= llm.Chat.from_id(db, chat_id)
            resp = chat.message(
                msg="""Return a JSON list of all the menu items you have recommended.
    Format: {{"items": ["one", "two", "three", ...]}}""",
                save=False,
                response_format={"type": "json_object"},
            )
            return json.loads(resp)


# =============================================================================
# MY TABLE ENDPOINTS - Social Trust Infrastructure (RALPH Framework)
# =============================================================================

@api_namespace.route('/table/invite')
class TableInvite(Resource):
    @require_auth
    def post(self):
        """
        Send table invitation (2-way handshake required).

        CRITICAL SECURITY:
        - user_id comes from JWT only (never trust request body)
        - Max 10 ACCEPTED table members enforced
        - Rate limit: 3 invites per day
        - invited_reason required (min 20 chars)
        """
        with GetDB() as db:
            # SECURITY: Get user_id from validated JWT (maps Supabase UUID → integer via email)
            user_id = user_helpers.get_current_user_id(db)

            # Extract request data
            data = request.json
            invitee_user_id = data.get('invitee_user_id')
            invited_reason = data.get('invited_reason', '').strip()

            # Validation: invitee_user_id required
            if not invitee_user_id:
                api.abort(400, 'invitee_user_id is required')

            # Validation: invited_reason min 20 chars
            if len(invited_reason) < 20:
                api.abort(400, 'invited_reason must be at least 20 characters')

            # Validation: Cannot invite yourself
            if user_id == invitee_user_id:
                api.abort(400, 'Cannot invite yourself')

            # Validation: Invitee must exist
            invitee = db.query(db_models.User).get(invitee_user_id)
            if not invitee:
                api.abort(404, 'Invitee user not found')

            # SECURITY: Check rate limit (3 invites per day)
            rate_limiter.check_rate_limit(db, user_id, 'invite')

            # SECURITY: Enforce max 10 ACCEPTED table members
            accepted_count = db.query(db_models.TableConnection).filter_by(
                user_id=user_id,
                status='accepted'
            ).count()

            if accepted_count >= MAX_TABLE_MEMBERS:
                api.abort(400, f'Table full (max {MAX_TABLE_MEMBERS} accepted members)')

            # Check if already connected (any status)
            existing = db.query(db_models.TableConnection).filter(
                ((db_models.TableConnection.user_id == user_id) &
                 (db_models.TableConnection.table_member_user_id == invitee_user_id)) |
                ((db_models.TableConnection.user_id == invitee_user_id) &
                 (db_models.TableConnection.table_member_user_id == user_id))
            ).first()

            if existing:
                api.abort(400, f'Connection already exists with status: {existing.status}')

            # Create invitation
            invitation = db_models.TableConnection(
                user_id=user_id,
                table_member_user_id=invitee_user_id,
                status='invited',
                invited_reason=invited_reason,
                connection_strength=0,
                help_count=0
            )
            db.add(invitation)
            db_models.transact(db)

            logger.info(f"✅ User {user_id} invited user {invitee_user_id} to table")

            return jsonify({
                'invite_id': invitation.id,
                'status': 'invited',
                'invitee_user_id': invitee_user_id,
                'created_at': invitation.created_at.isoformat()
            })


@api_namespace.route('/table/invite/<int:invite_id>/respond')
class TableInviteRespond(Resource):
    @require_auth
    def post(self, invite_id):
        """
        Respond to table invitation (accept/decline/block).

        CRITICAL SECURITY:
        - Only invitee can respond (not the inviter)
        - user_id verified from JWT only
        - Action must be: 'accept', 'decline', or 'block'
        """
        with GetDB() as db:
            # SECURITY: Get user_id from validated JWT
            user_id = user_helpers.get_current_user_id(db)

            # Extract action
            data = request.json
            action = data.get('action')

            # Validation: action required
            if action not in ['accept', 'decline', 'block']:
                api.abort(400, "action must be 'accept', 'decline', or 'block'")

            # Get invitation
            invitation = db.query(db_models.TableConnection).get(invite_id)
            if not invitation:
                api.abort(404, 'Invitation not found')

            # SECURITY: Only invitee can respond
            if invitation.table_member_user_id != user_id:
                logger.warning(
                    f"❌ Authorization failed: User {user_id} tried to respond to "
                    f"invite {invite_id} but is not the invitee (invitee={invitation.table_member_user_id})"
                )
                api.abort(403, 'Only the invitee can respond to this invitation')

            # SECURITY: Invitation must be in 'invited' status
            if invitation.status != 'invited':
                api.abort(400, f'Invitation already processed (status: {invitation.status})')

            # If accepting, check inviter's table isn't already full
            if action == 'accept':
                inviter_accepted_count = db.query(db_models.TableConnection).filter_by(
                    user_id=invitation.user_id,
                    status='accepted'
                ).count()

                if inviter_accepted_count >= MAX_TABLE_MEMBERS:
                    api.abort(400, f"Inviter's table is full (max {MAX_TABLE_MEMBERS} members)")

                # Check invitee's table isn't full
                invitee_accepted_count = db.query(db_models.TableConnection).filter_by(
                    user_id=user_id,
                    status='accepted'
                ).count()

                if invitee_accepted_count >= MAX_TABLE_MEMBERS:
                    api.abort(400, f"Your table is full (max {MAX_TABLE_MEMBERS} members)")

            # Update invitation status
            invitation.status = action + 'ed' if action != 'block' else 'blocked'
            invitation.updated_at = datetime.utcnow()
            db_models.transact(db)

            logger.info(f"✅ User {user_id} {invitation.status} invite {invite_id} from user {invitation.user_id}")

            return jsonify({
                'invite_id': invite_id,
                'status': invitation.status,
                'action': action
            })


@api_namespace.route('/table/answers/<int:answer_id>/mark-helpful')
class MarkAnswerHelpful(Resource):
    @require_auth
    def post(self, answer_id):
        """
        Mark answer as helpful (asker-only, idempotent).

        CRITICAL SECURITY:
        - Only question asker can mark helpful
        - Idempotent: If already helpful, return OK without side effects
        - Increments help_count in table_connections once per helpful answer
        - user_id verified from JWT only
        """
        with GetDB() as db:
            # SECURITY: Get user_id from validated JWT
            user_id = user_helpers.get_current_user_id(db)

            # Get answer
            answer = db.query(db_models.TableAnswer).get(answer_id)
            if not answer:
                api.abort(404, 'Answer not found')

            # Get question
            question = db.query(db_models.TableQuestion).get(answer.question_id)
            if not question:
                api.abort(404, 'Question not found')

            # SECURITY: Only asker can mark helpful
            if question.asker_user_id != user_id:
                logger.warning(
                    f"❌ Authorization failed: User {user_id} tried to mark answer {answer_id} helpful "
                    f"but is not the asker (asker={question.asker_user_id})"
                )
                api.abort(403, 'Only the question asker can mark answers helpful')

            # SECURITY: Block self-helpful exploit (cannot mark own answer helpful)
            if answer.answerer_user_id == user_id:
                logger.warning(
                    f"❌ Self-helpful blocked: User {user_id} tried to mark their own answer {answer_id} helpful"
                )
                api.abort(400, 'Cannot mark your own answer as helpful')

            # ATOMIC: Mark answer as helpful ONLY if not already helpful
            # This prevents race condition where two simultaneous requests could double-increment help_count
            from sqlalchemy import update

            now = datetime.utcnow()
            result = db.execute(
                update(db_models.TableAnswer)
                .where(db_models.TableAnswer.id == answer_id)
                .where(db_models.TableAnswer.helpful == False)  # Guard: only if not already helpful
                .values(
                    helpful=True,
                    helpful_marked_at=now
                )
            )

            if result.rowcount == 0:
                # Already marked helpful by another request (idempotent)
                logger.info(f"⚠️ Answer {answer_id} already marked helpful (idempotent return)")
                return jsonify({
                    'answer_id': answer_id,
                    'helpful': True,
                    'already_marked': True,
                    'help_count_changed': False
                })

            # If we get here, we successfully marked it helpful (atomically)
            # NOW increment help_count (only happens once per answer)
            logger.info(f"✅ Atomically marked answer {answer_id} as helpful")

            # Find connection between asker and answerer
            connection = db.query(db_models.TableConnection).filter(
                db_models.TableConnection.status == 'accepted',
                (
                    ((db_models.TableConnection.user_id == user_id) &
                     (db_models.TableConnection.table_member_user_id == answer.answerer_user_id)) |
                    ((db_models.TableConnection.user_id == answer.answerer_user_id) &
                     (db_models.TableConnection.table_member_user_id == user_id))
                )
            ).first()

            help_count_incremented = False
            if connection:
                connection.help_count += 1
                connection.updated_at = datetime.utcnow()
                help_count_incremented = True
                logger.info(
                    f"✅ Incremented help_count for connection {connection.id} "
                    f"(new count: {connection.help_count})"
                )
            else:
                logger.warning(
                    f"⚠️ No accepted table connection found between asker {user_id} "
                    f"and answerer {answer.answerer_user_id} - help_count not incremented"
                )

            # Create help_history record
            help_record = db_models.HelpHistory(
                helped_user_id=user_id,
                helper_user_id=answer.answerer_user_id,
                interaction_type='answered_question',
                question_id=question.id
            )
            db.add(help_record)

            db_models.transact(db)

            logger.info(
                f"✅ User {user_id} marked answer {answer_id} helpful "
                f"(answerer: {answer.answerer_user_id}, help_count_changed: {help_count_incremented})"
            )

            return jsonify({
                'answer_id': answer_id,
                'helpful': True,
                'already_marked': False,
                'help_count_changed': help_count_incremented,
                'marked_at': now.isoformat()
            })


# =============================================================================
# TABLE CONNECTIONS API
# =============================================================================

@api_namespace.route('/table/connections')
class TableConnections(Resource):
    @require_auth
    def get(self):
        """
        List all table connections for current user (bidirectional).

        Returns accepted connections with:
        - User details for each connection
        - help_count, connection_strength
        - invited_reason
        - Ordered by connection_strength descending

        SECURITY:
        - Only returns accepted connections
        - user_id verified from JWT only
        - Bidirectional: Shows both sent and received connections
        """
        with GetDB() as db:
            # SECURITY: Get user_id from validated JWT
            user_id = user_helpers.get_current_user_id(db)

            # Query connections where user is either sender or receiver (bidirectional)
            # Only include accepted connections
            connections = db.query(db_models.TableConnection).filter(
                db_models.TableConnection.status == 'accepted',
                (
                    (db_models.TableConnection.user_id == user_id) |
                    (db_models.TableConnection.table_member_user_id == user_id)
                )
            ).order_by(
                db_models.TableConnection.connection_strength.desc(),
                db_models.TableConnection.help_count.desc()
            ).all()

            # Format response with user details
            result = []
            for conn in connections:
                # Determine which user is the "other" user (not the current user)
                if conn.user_id == user_id:
                    other_user_id = conn.table_member_user_id
                    other_user = conn.table_member
                else:
                    other_user_id = conn.user_id
                    other_user = conn.user

                result.append({
                    'connection_id': conn.id,
                    'user_id': other_user_id,
                    'name': other_user.name,
                    'display_name': other_user.display_name,
                    'photo_url': other_user.photo_url,
                    'bio': other_user.bio,
                    'help_count': conn.help_count,
                    'connection_strength': conn.connection_strength,
                    'invited_reason': conn.invited_reason,
                    'created_at': conn.created_at.isoformat(),
                    'updated_at': conn.updated_at.isoformat() if conn.updated_at else None
                })

            logger.info(f"✅ User {user_id} listed {len(result)} table connections")

            return jsonify({'connections': result})


@api_namespace.route('/table/connections/<int:connection_id>')
class TableConnectionDetail(Resource):
    @require_auth
    def delete(self, connection_id):
        """
        Remove a table connection (soft delete - set status to 'removed').

        SECURITY:
        - Only the connection owner can remove (bidirectional check)
        - Checks both user_id and table_member_user_id
        - user_id verified from JWT only
        """
        with GetDB() as db:
            # SECURITY: Get user_id from validated JWT
            user_id = user_helpers.get_current_user_id(db)

            # Get connection
            connection = db.query(db_models.TableConnection).get(connection_id)
            if not connection:
                api.abort(404, 'Connection not found')

            # AUTHORIZATION: Only connection participants can remove (bidirectional)
            if connection.user_id != user_id and connection.table_member_user_id != user_id:
                logger.warning(
                    f"❌ Authorization failed: User {user_id} tried to remove connection {connection_id} "
                    f"but is not a participant (user_id={connection.user_id}, "
                    f"table_member_user_id={connection.table_member_user_id})"
                )
                api.abort(403, 'Only connection participants can remove this connection')

            # Soft delete: Set status to 'removed'
            connection.status = 'removed'
            connection.updated_at = datetime.utcnow()
            db_models.transact(db)

            logger.info(
                f"✅ User {user_id} removed connection {connection_id} "
                f"(between user {connection.user_id} and {connection.table_member_user_id})"
            )

            return jsonify({
                'connection_id': connection_id,
                'status': 'removed',
                'removed_at': connection.updated_at.isoformat()
            })


# =============================================================================
# QUESTIONS API
# =============================================================================

@api_namespace.route('/table/questions')
class TableQuestions(Resource):
    @require_auth
    def post(self):
        """
        Ask a structured question to your table.

        SECURITY:
        - Rate limited: 5 questions/day
        - Template validation: Only allowed templates
        - Table-scoped visibility only
        - user_id from JWT only
        """
        with GetDB() as db:
            # SECURITY: Get user_id from validated JWT
            user_id = user_helpers.get_current_user_id(db)

            # RATE LIMIT: Check questions per day
            rate_limiter.check_rate_limit(db, user_id, 'question')

            # Get request data
            data = request.get_json()
            if not data:
                api.abort(400, 'Request body required')

            # Required fields
            template_id = data.get('template_id')
            restaurant_id = data.get('restaurant_id')
            visibility = data.get('visibility', 'table_only')

            if not template_id:
                api.abort(400, 'template_id is required')
            if not restaurant_id:
                api.abort(400, 'restaurant_id is required')

            # Validate template
            if template_id not in constants.ALLOWED_QUESTION_TEMPLATES:
                api.abort(400, f'Invalid template_id. Allowed: {list(constants.ALLOWED_QUESTION_TEMPLATES.keys())}')

            # SECURITY: Validate visibility (no public exposure)
            if visibility not in ALLOWED_VISIBILITY:
                api.abort(400, f"Invalid visibility. Allowed: {ALLOWED_VISIBILITY}")

            # Validate restaurant exists
            restaurant = db.query(db_models.Restaurant).get(restaurant_id)
            if not restaurant:
                api.abort(404, 'Restaurant not found')

            # Optional fields with defaults
            dietary_restriction = data.get('dietary_restriction')

            # SECURITY: Validate and clamp expire_days to prevent abuse
            expire_days = data.get('expire_days', 30)
            try:
                expire_days = int(expire_days)
            except (TypeError, ValueError):
                api.abort(400, "expire_days must be an integer")

            if expire_days < 1 or expire_days > 30:
                api.abort(400, "expire_days must be between 1 and 30")

            # Create question
            question = db_models.TableQuestion(
                asker_user_id=user_id,
                template_id=template_id,
                restaurant_id=restaurant_id,
                dietary_restriction=dietary_restriction,
                visibility=visibility,
                status='open',
                created_at=datetime.utcnow(),
                expires_at=datetime.utcnow() + timedelta(days=expire_days)
            )
            db.add(question)
            db_models.transact(db)

            logger.info(
                f"✅ User {user_id} created question {question.id} "
                f"(template: {template_id}, restaurant: {restaurant_id})"
            )

            return jsonify({
                'question_id': question.id,
                'template_id': template_id,
                'restaurant_id': restaurant_id,
                'status': 'open',
                'created_at': question.created_at.isoformat(),
                'expires_at': question.expires_at.isoformat()
            }), 201

    @require_auth
    def get(self):
        """
        List questions visible to current user.

        Returns:
        - Own questions (all)
        - Table members' table_only questions
        - Filters: status, restaurant_id
        """
        with GetDB() as db:
            # SECURITY: Get user_id from validated JWT
            user_id = user_helpers.get_current_user_id(db)

            # Get table member IDs (bidirectional)
            table_member_ids = user_helpers.get_bidirectional_table_members(db, user_id)

            # Query params for filtering
            status_filter = request.args.get('status')  # open, answered, expired
            restaurant_id = request.args.get('restaurant_id', type=int)

            # Build query
            query = db.query(db_models.TableQuestion).filter(
                # Visibility: Own questions OR table members' table_only questions
                (db_models.TableQuestion.asker_user_id == user_id) |
                (
                    (db_models.TableQuestion.asker_user_id.in_(table_member_ids)) &
                    (db_models.TableQuestion.visibility == 'table_only')
                )
            )

            # Apply filters
            if status_filter:
                if status_filter not in constants.ALLOWED_QUESTION_STATUS:
                    api.abort(400, f'Invalid status. Allowed: {constants.ALLOWED_QUESTION_STATUS}')
                query = query.filter(db_models.TableQuestion.status == status_filter)

            if restaurant_id:
                query = query.filter(db_models.TableQuestion.restaurant_id == restaurant_id)

            # Order by newest first
            questions = query.order_by(db_models.TableQuestion.created_at.desc()).all()

            # Format response
            result = []
            for q in questions:
                # Get answer count
                answer_count = db.query(db_models.TableAnswer).filter_by(question_id=q.id).count()

                result.append({
                    'question_id': q.id,
                    'asker_user_id': q.asker_user_id,
                    'template_id': q.template_id,
                    'restaurant_id': q.restaurant_id,
                    'dietary_restriction': q.dietary_restriction,
                    'visibility': q.visibility,
                    'status': q.status,
                    'answer_count': answer_count,
                    'created_at': q.created_at.isoformat(),
                    'expires_at': q.expires_at.isoformat() if q.expires_at else None,
                    'is_own': q.asker_user_id == user_id
                })

            logger.info(f"✅ User {user_id} listed {len(result)} questions")

            return jsonify({'questions': result})


@api_namespace.route('/table/questions/<int:question_id>')
class TableQuestionDetail(Resource):
    @require_auth
    def get(self, question_id):
        """
        Get specific question with all answers.

        SECURITY:
        - Only accessible if user can see question (own or table member's table_only)
        """
        with GetDB() as db:
            # SECURITY: Get user_id from validated JWT
            user_id = user_helpers.get_current_user_id(db)

            # Get question
            question = db.query(db_models.TableQuestion).get(question_id)
            if not question:
                api.abort(404, 'Question not found')

            # AUTHORIZATION: Check if user can see this question
            if not user_helpers.can_see_question(db, user_id, question):
                logger.warning(
                    f"❌ Authorization failed: User {user_id} cannot see question {question_id} "
                    f"(asker: {question.asker_user_id}, visibility: {question.visibility})"
                )
                api.abort(403, 'You do not have permission to view this question')

            # Get all answers
            answers = db.query(db_models.TableAnswer).filter_by(question_id=question_id).order_by(
                db_models.TableAnswer.created_at.asc()
            ).all()

            # Format response
            answer_list = []
            for a in answers:
                answer_list.append({
                    'answer_id': a.id,
                    'answerer_user_id': a.answerer_user_id,
                    'answer_text': a.answer_text,
                    'what_ordered': a.what_ordered,
                    'helpful': a.helpful,
                    'created_at': a.created_at.isoformat()
                })

            result = {
                'question_id': question.id,
                'asker_user_id': question.asker_user_id,
                'template_id': question.template_id,
                'restaurant_id': question.restaurant_id,
                'dietary_restriction': question.dietary_restriction,
                'visibility': question.visibility,
                'status': question.status,
                'created_at': question.created_at.isoformat(),
                'expires_at': question.expires_at.isoformat() if question.expires_at else None,
                'answers': answer_list,
                'is_own': question.asker_user_id == user_id
            }

            logger.info(f"✅ User {user_id} viewed question {question_id} ({len(answer_list)} answers)")

            return jsonify(result)

    @require_auth
    def put(self, question_id):
        """
        Update question status (mark as answered/expired).

        SECURITY:
        - Only asker can update their own question
        """
        with GetDB() as db:
            # SECURITY: Get user_id from validated JWT
            user_id = user_helpers.get_current_user_id(db)

            # Get question
            question = db.query(db_models.TableQuestion).get(question_id)
            if not question:
                api.abort(404, 'Question not found')

            # AUTHORIZATION: Only asker can update
            if question.asker_user_id != user_id:
                logger.warning(
                    f"❌ Authorization failed: User {user_id} tried to update question {question_id} "
                    f"but is not the asker (asker: {question.asker_user_id})"
                )
                api.abort(403, 'Only the question asker can update the question')

            # Get request data
            data = request.get_json()
            if not data:
                api.abort(400, 'Request body required')

            # Update status
            new_status = data.get('status')
            if new_status:
                if new_status not in constants.ALLOWED_QUESTION_STATUS:
                    api.abort(400, f'Invalid status. Allowed: {constants.ALLOWED_QUESTION_STATUS}')
                question.status = new_status

            db_models.transact(db)

            logger.info(f"✅ User {user_id} updated question {question_id} status to {new_status}")

            return jsonify({
                'question_id': question_id,
                'status': question.status,
                'updated_at': datetime.utcnow().isoformat()
            })

    @require_auth
    def delete(self, question_id):
        """
        Delete question (soft delete by marking as expired).

        SECURITY:
        - Only asker can delete their own question
        """
        with GetDB() as db:
            # SECURITY: Get user_id from validated JWT
            user_id = user_helpers.get_current_user_id(db)

            # Get question
            question = db.query(db_models.TableQuestion).get(question_id)
            if not question:
                api.abort(404, 'Question not found')

            # AUTHORIZATION: Only asker can delete
            if question.asker_user_id != user_id:
                logger.warning(
                    f"❌ Authorization failed: User {user_id} tried to delete question {question_id} "
                    f"but is not the asker (asker: {question.asker_user_id})"
                )
                api.abort(403, 'Only the question asker can delete the question')

            # Soft delete: Mark as expired
            question.status = 'expired'
            db_models.transact(db)

            logger.info(f"✅ User {user_id} deleted (marked expired) question {question_id}")

            return jsonify({
                'question_id': question_id,
                'deleted': True,
                'status': 'expired'
            })


# =============================================================================
# ANSWERS API
# =============================================================================

@api_namespace.route('/table/questions/<int:question_id>/answers')
class TableAnswers(Resource):
    @require_auth
    def post(self, question_id):
        """
        Answer a question from your table.

        SECURITY:
        - Rate limited: 20 answers/day
        - Table-scoped: Can only answer questions you can see
        - Cannot answer your own questions
        - Question must be 'open' status
        - user_id from JWT only
        """
        with GetDB() as db:
            # SECURITY: Get user_id from validated JWT
            user_id = user_helpers.get_current_user_id(db)

            # RATE LIMIT: Check answers per day
            rate_limiter.check_rate_limit(db, user_id, 'answer')

            # Get question
            question = db.query(db_models.TableQuestion).get(question_id)
            if not question:
                api.abort(404, 'Question not found')

            # AUTHORIZATION: Check if user can see this question
            if not user_helpers.can_see_question(db, user_id, question):
                logger.warning(
                    f"❌ Authorization failed: User {user_id} cannot answer question {question_id} "
                    f"(asker: {question.asker_user_id}, visibility: {question.visibility})"
                )
                api.abort(403, 'You do not have permission to answer this question')

            # SECURITY: Cannot answer your own question
            if question.asker_user_id == user_id:
                logger.warning(
                    f"❌ Self-answer blocked: User {user_id} tried to answer their own question {question_id}"
                )
                api.abort(400, 'Cannot answer your own question')

            # VALIDATION: Question must be open
            if question.status != 'open':
                api.abort(400, f'Cannot answer question with status: {question.status}')

            # Get request data
            data = request.get_json()
            if not data:
                api.abort(400, 'Request body required')

            # Required fields
            answer_text = data.get('answer_text')
            if not answer_text:
                api.abort(400, 'answer_text is required')

            # Validate answer_text is not empty
            answer_text = answer_text.strip()
            if not answer_text:
                api.abort(400, 'answer_text cannot be empty')

            # Optional fields
            what_ordered = data.get('what_ordered')
            if what_ordered:
                what_ordered = what_ordered.strip()
                if not what_ordered:
                    what_ordered = None

            # Create answer
            answer = db_models.TableAnswer(
                question_id=question_id,
                answerer_user_id=user_id,
                answer_text=answer_text,
                what_ordered=what_ordered,
                helpful=False,
                created_at=datetime.utcnow()
            )
            db.add(answer)
            db_models.transact(db)

            logger.info(
                f"✅ User {user_id} answered question {question_id} "
                f"(answer_id: {answer.id})"
            )

            return jsonify({
                'answer_id': answer.id,
                'question_id': question_id,
                'answerer_user_id': user_id,
                'answer_text': answer_text,
                'what_ordered': what_ordered,
                'helpful': False,
                'created_at': answer.created_at.isoformat()
            }), 201


# =============================================================================
# SAFETY SIGNALS API
# =============================================================================

@api_namespace.route('/table/signals')
class SafetySignals(Resource):
    @require_auth
    def post(self):
        """
        Create safety signal ("ate safely" report).

        SECURITY:
        - Rate limited: 10 signals/day
        - Table-scoped visibility only
        - 90-day expiration enforced
        - user_id from JWT only
        """
        with GetDB() as db:
            # SECURITY: Get user_id from validated JWT
            user_id = user_helpers.get_current_user_id(db)

            # RATE LIMIT: Check signals per day
            rate_limiter.check_rate_limit(db, user_id, 'signal')

            # Get request data
            data = request.get_json()
            if not data:
                api.abort(400, 'Request body required')

            # Required fields
            restaurant_id = data.get('restaurant_id')
            restrictions_met = data.get('restrictions_met')

            if not restaurant_id:
                api.abort(400, 'restaurant_id is required')
            if not restrictions_met:
                api.abort(400, 'restrictions_met is required')

            # Validate restaurant exists
            restaurant = db.query(db_models.Restaurant).get(restaurant_id)
            if not restaurant:
                api.abort(404, 'Restaurant not found')

            # Validate restrictions_met is a JSON array string
            try:
                if isinstance(restrictions_met, str):
                    restrictions_list = json.loads(restrictions_met)
                else:
                    restrictions_list = restrictions_met

                if not isinstance(restrictions_list, list):
                    api.abort(400, 'restrictions_met must be a JSON array')

                # Ensure it's stored as a JSON string
                restrictions_met_str = json.dumps(restrictions_list)
            except (json.JSONDecodeError, TypeError):
                api.abort(400, 'restrictions_met must be a valid JSON array')

            # Optional fields with defaults
            dish_name = data.get('dish_name')
            what_worked = data.get('what_worked')
            notes = data.get('notes')
            verification_state = data.get('verification_state', 'unverified')
            evidence_type = data.get('evidence_type', 'user_experience')
            confidence = data.get('confidence', 5)
            visibility = data.get('visibility', 'table_only')
            attribution = data.get('attribution', 'attributed')

            # SECURITY: Validate verification_state
            if verification_state not in ALLOWED_VERIFICATION_STATES:
                api.abort(400, f'Invalid verification_state. Allowed: {ALLOWED_VERIFICATION_STATES}')

            # SECURITY: Validate evidence_type
            if evidence_type not in ALLOWED_EVIDENCE_TYPES:
                api.abort(400, f'Invalid evidence_type. Allowed: {ALLOWED_EVIDENCE_TYPES}')

            # SECURITY: Validate confidence (1-5)
            try:
                confidence = int(confidence)
            except (TypeError, ValueError):
                api.abort(400, 'confidence must be an integer')

            if confidence < 1 or confidence > 5:
                api.abort(400, 'confidence must be between 1 and 5')

            # SECURITY: Validate visibility (no public option)
            if visibility not in ALLOWED_VISIBILITY:
                api.abort(400, f'Invalid visibility. Allowed: {ALLOWED_VISIBILITY}')

            # Create safety signal
            signal = db_models.SafetySignal(
                user_id=user_id,
                restaurant_id=restaurant_id,
                dish_name=dish_name,
                restrictions_met=restrictions_met_str,
                what_worked=what_worked,
                notes=notes,
                verification_state=verification_state,
                evidence_type=evidence_type,
                confidence=confidence,
                visibility=visibility,
                attribution=attribution,
                created_at=datetime.utcnow(),
                expires_at=datetime.utcnow() + timedelta(days=90)  # 90-day expiration
            )
            db.add(signal)
            db_models.transact(db)

            logger.info(
                f"✅ User {user_id} created safety signal {signal.id} "
                f"(restaurant: {restaurant_id}, restrictions: {restrictions_list})"
            )

            return jsonify({
                'signal_id': signal.id,
                'restaurant_id': restaurant_id,
                'restrictions_met': restrictions_list,
                'verification_state': verification_state,
                'confidence': confidence,
                'created_at': signal.created_at.isoformat(),
                'expires_at': signal.expires_at.isoformat()
            }), 201

    @require_auth
    def get(self):
        """
        List safety signals visible to current user.

        Returns:
        - Own signals (all)
        - Table members' table_only signals
        - Filters: restaurant_id, restriction_type
        - Excludes expired signals
        """
        with GetDB() as db:
            # SECURITY: Get user_id from validated JWT
            user_id = user_helpers.get_current_user_id(db)

            # Get table member IDs (bidirectional)
            table_member_ids = user_helpers.get_bidirectional_table_members(db, user_id)

            # Query params for filtering
            restaurant_id = request.args.get('restaurant_id', type=int)
            restriction_type = request.args.get('restriction_type')

            # Build query - exclude expired signals
            now = datetime.utcnow()
            query = db.query(db_models.SafetySignal).filter(
                db_models.SafetySignal.expires_at > now
            ).filter(
                # Visibility: Own signals OR table members' table_only signals
                (db_models.SafetySignal.user_id == user_id) |
                (
                    (db_models.SafetySignal.user_id.in_(table_member_ids)) &
                    (db_models.SafetySignal.visibility == 'table_only')
                )
            )

            # Apply filters
            if restaurant_id:
                query = query.filter(db_models.SafetySignal.restaurant_id == restaurant_id)

            if restriction_type:
                # Filter by restriction_type in the JSON array
                query = query.filter(db_models.SafetySignal.restrictions_met.like(f'%{restriction_type}%'))

            # Order by newest first
            signals = query.order_by(db_models.SafetySignal.created_at.desc()).all()

            # Format response
            result = []
            for s in signals:
                # Parse restrictions_met JSON
                try:
                    restrictions_list = json.loads(s.restrictions_met) if s.restrictions_met else []
                except (json.JSONDecodeError, TypeError):
                    restrictions_list = []

                result.append({
                    'signal_id': s.id,
                    'user_id': s.user_id if s.attribution == 'attributed' else None,
                    'restaurant_id': s.restaurant_id,
                    'dish_name': s.dish_name,
                    'restrictions_met': restrictions_list,
                    'what_worked': s.what_worked,
                    'notes': s.notes,
                    'verification_state': s.verification_state,
                    'evidence_type': s.evidence_type,
                    'confidence': s.confidence,
                    'visibility': s.visibility,
                    'attribution': s.attribution,
                    'created_at': s.created_at.isoformat(),
                    'expires_at': s.expires_at.isoformat(),
                    'is_own': s.user_id == user_id
                })

            logger.info(f"✅ User {user_id} listed {len(result)} safety signals")

            return jsonify({'signals': result})


# =============================================================================
# TRUST SCORES API
# =============================================================================

@api_namespace.route('/table/restaurants/<int:restaurant_id>/trust-scores')
class RestaurantTrustScores(Resource):
    @require_auth
    def get(self, restaurant_id):
        """
        Get trust scores for a restaurant by restriction type.

        SECURITY:
        - Auth required (table-scoped data)
        - Returns all RestaurantTrustScore entries for the restaurant
        """
        with GetDB() as db:
            # SECURITY: Get user_id from validated JWT (for audit logging)
            user_id = user_helpers.get_current_user_id(db)

            # Validate restaurant exists
            restaurant = db.query(db_models.Restaurant).get(restaurant_id)
            if not restaurant:
                api.abort(404, 'Restaurant not found')

            # Get all trust scores for this restaurant
            trust_scores = db.query(db_models.RestaurantTrustScore).filter_by(
                restaurant_id=restaurant_id
            ).all()

            # Format response
            result = []
            for ts in trust_scores:
                result.append({
                    'restriction_type': ts.restriction_type,
                    'trust_score': ts.trust_score,
                    'signal_count': ts.signal_count,
                    'confidence_state': ts.confidence_state,
                    'last_signal_at': ts.last_signal_at.isoformat() if ts.last_signal_at else None,
                    'calculated_at': ts.calculated_at.isoformat()
                })

            logger.info(
                f"✅ User {user_id} viewed trust scores for restaurant {restaurant_id} "
                f"({len(result)} restriction types)"
            )

            return jsonify({
                'restaurant_id': restaurant_id,
                'trust_scores': result
            })


@api_namespace.route('/admin/calculate-trust-scores')
class CalculateTrustScores(Resource):
    @require_auth
    def post(self):
        """
        Calculate and update restaurant trust scores based on SafetySignal data.

        ALGORITHM:
        1. Query all non-expired SafetySignal records
        2. Group by (restaurant_id, restriction_type)
        3. Apply weighting based on:
           - Age decay (30-day curve)
           - Source credibility
           - Confidence level
        4. Calculate trust_score (0.0 to 1.0)
        5. Determine confidence_state
        6. Update or create RestaurantTrustScore records

        SECURITY:
        - Can be admin-only or public (currently requires auth)
        - Idempotent operation
        """
        with GetDB() as db:
            # SECURITY: Get user_id from validated JWT
            user_id = user_helpers.get_current_user_id(db)

            # Optional: Filter by restaurant_id if provided
            data = request.get_json() or {}
            target_restaurant_id = data.get('restaurant_id')

            # Step 1: Query all non-expired SafetySignal records
            now = datetime.utcnow()
            query = db.query(db_models.SafetySignal).filter(
                db_models.SafetySignal.expires_at > now
            )

            if target_restaurant_id:
                query = query.filter(db_models.SafetySignal.restaurant_id == target_restaurant_id)

            signals = query.all()

            logger.info(f"🔄 Starting trust score calculation for {len(signals)} signals")

            # Step 2: Group by (restaurant_id, restriction_type)
            # Parse restriction_type from restrictions_met JSON array
            grouped_signals = {}
            for signal in signals:
                try:
                    restrictions_list = json.loads(signal.restrictions_met) if signal.restrictions_met else []
                except (json.JSONDecodeError, TypeError):
                    continue

                for restriction_type in restrictions_list:
                    key = (signal.restaurant_id, restriction_type)
                    if key not in grouped_signals:
                        grouped_signals[key] = []
                    grouped_signals[key].append(signal)

            logger.info(f"🔄 Grouped into {len(grouped_signals)} restaurant-restriction combinations")

            # Step 3-6: Calculate trust scores for each group
            updated_count = 0
            created_count = 0

            for (restaurant_id, restriction_type), group_signals in grouped_signals.items():
                # Calculate weighted scores
                weighted_scores = []
                weights = []
                confidence_scores = []

                for signal in group_signals:
                    # Age decay weight
                    age_days = (now - signal.created_at).days
                    if age_days < 7:
                        age_weight = 1.0
                    elif age_days < 30:
                        age_weight = 0.7
                    elif age_days < 60:
                        age_weight = 0.4
                    elif age_days < 90:
                        age_weight = 0.2
                    else:
                        age_weight = 0.1  # Should be expired, but safeguard

                    # Source credibility weight
                    credibility_multiplier = {
                        'kitchen_confirmed': 2.0,
                        'staff_verified': 1.5,
                        'restaurant_verified': 1.3,
                        'unverified': 1.0
                    }.get(signal.verification_state, 1.0)

                    # Confidence multiplier (1-5 scale normalized to 0.2-1.0)
                    confidence_multiplier = signal.confidence / 5.0

                    # Combined weight
                    combined_weight = age_weight * credibility_multiplier * confidence_multiplier

                    # Weighted confidence score
                    weighted_score = signal.confidence * combined_weight

                    weighted_scores.append(weighted_score)
                    weights.append(combined_weight)
                    confidence_scores.append(signal.confidence)

                # Calculate trust_score (0.0 to 1.0)
                if sum(weights) > 0:
                    weighted_avg = sum(weighted_scores) / sum(weights)
                    # Normalize from 1-5 scale to 0.0-1.0 scale
                    trust_score = (weighted_avg - 1.0) / 4.0
                    trust_score = max(0.0, min(1.0, trust_score))  # Clamp to [0.0, 1.0]
                else:
                    trust_score = 0.0

                # Calculate standard deviation for conflicting signals detection
                if len(confidence_scores) > 1:
                    mean_confidence = sum(confidence_scores) / len(confidence_scores)
                    variance = sum((x - mean_confidence) ** 2 for x in confidence_scores) / len(confidence_scores)
                    std_dev = variance ** 0.5
                    # Normalize std_dev to 0.0-1.0 scale (max possible std_dev on 1-5 scale is 2.0)
                    normalized_std_dev = std_dev / 2.0
                else:
                    normalized_std_dev = 0.0

                # Determine confidence_state
                signal_count = len(group_signals)
                if normalized_std_dev > 0.3:
                    confidence_state = 'conflicting_signals'
                elif signal_count >= 10:
                    confidence_state = 'high_confidence'
                elif signal_count >= 5:
                    confidence_state = 'medium_confidence'
                elif signal_count >= 2:
                    confidence_state = 'low_confidence'
                else:
                    confidence_state = 'insufficient_data'

                # Find last signal timestamp
                last_signal_at = max(s.created_at for s in group_signals)

                # Update or create RestaurantTrustScore
                existing_score = db.query(db_models.RestaurantTrustScore).filter_by(
                    restaurant_id=restaurant_id,
                    restriction_type=restriction_type
                ).first()

                if existing_score:
                    existing_score.trust_score = trust_score
                    existing_score.signal_count = signal_count
                    existing_score.confidence_state = confidence_state
                    existing_score.last_signal_at = last_signal_at
                    existing_score.calculated_at = now
                    updated_count += 1
                else:
                    new_score = db_models.RestaurantTrustScore(
                        restaurant_id=restaurant_id,
                        restriction_type=restriction_type,
                        trust_score=trust_score,
                        signal_count=signal_count,
                        confidence_state=confidence_state,
                        last_signal_at=last_signal_at,
                        calculated_at=now
                    )
                    db.add(new_score)
                    created_count += 1

            # Commit all changes
            db_models.transact(db)

            logger.info(
                f"✅ Trust score calculation completed by user {user_id}: "
                f"{created_count} created, {updated_count} updated "
                f"({len(grouped_signals)} total combinations)"
            )

            return jsonify({
                'success': True,
                'created_count': created_count,
                'updated_count': updated_count,
                'total_combinations': len(grouped_signals),
                'calculated_at': now.isoformat()
            }), 200


# =============================================================================
# DISCOVERY & ABUSE PREVENTION API
# =============================================================================

@api_namespace.route('/table/discovery')
class TableDiscovery(Resource):
    @require_auth
    def get(self):
        """
        Discover helpful people based on HelpHistory.

        Returns top 10 helpers who:
        - Have helped current user before
        - Are NOT already in table connections
        - Ordered by number of helpful interactions

        SECURITY:
        - user_id from JWT only
        - Only shows people who helped YOU (not others)
        """
        with GetDB() as db:
            # SECURITY: Get user_id from validated JWT
            user_id = user_helpers.get_current_user_id(db)

            # Get existing table connection user IDs (exclude these)
            existing_connections = db.query(db_models.TableConnection.table_member_user_id).filter_by(
                user_id=user_id
            ).union(
                db.query(db_models.TableConnection.user_id).filter_by(
                    table_member_user_id=user_id
                )
            ).all()
            existing_connection_ids = [row[0] for row in existing_connections]

            # Query HelpHistory where helped_user_id = current_user_id
            # Group by helper_user_id, count interactions
            from sqlalchemy import func
            helper_stats = db.query(
                db_models.HelpHistory.helper_user_id,
                func.count(db_models.HelpHistory.id).label('interaction_count')
            ).filter(
                db_models.HelpHistory.helped_user_id == user_id,
                db_models.HelpHistory.helper_user_id.notin_(existing_connection_ids)  # Exclude existing connections
            ).group_by(
                db_models.HelpHistory.helper_user_id
            ).order_by(
                func.count(db_models.HelpHistory.id).desc()
            ).limit(10).all()

            # Get user details for each helper
            result = []
            for helper_user_id, interaction_count in helper_stats:
                helper = db.query(db_models.User).get(helper_user_id)
                if helper:
                    result.append({
                        'user_id': helper.id,
                        'display_name': helper.display_name or helper.name,
                        'email': helper.email,
                        'bio': helper.bio,
                        'photo_url': helper.photo_url,
                        'interaction_count': interaction_count
                    })

            logger.info(f"✅ User {user_id} discovered {len(result)} helpful people")

            return jsonify({
                'helpers': result,
                'count': len(result)
            })


@api_namespace.route('/table/reports')
class TableReports(Resource):
    @require_auth
    def post(self):
        """
        Report abuse (spam, inappropriate, unsafe_advice, harassment).

        SECURITY:
        - user_id from JWT only
        - Validates report_type and target_type
        - Requires exactly one target ID based on target_type
        """
        with GetDB() as db:
            # SECURITY: Get user_id from validated JWT
            user_id = user_helpers.get_current_user_id(db)

            # Get request data
            data = request.get_json()
            if not data:
                api.abort(400, 'Request body required')

            # Required fields
            report_type = data.get('report_type')
            target_type = data.get('target_type')
            reason = data.get('reason', '').strip()

            # Validate required fields
            if not report_type:
                api.abort(400, 'report_type is required')
            if not target_type:
                api.abort(400, 'target_type is required')
            if not reason:
                api.abort(400, 'reason is required')

            # Validate report_type
            if report_type not in ALLOWED_REPORT_TYPES:
                api.abort(400, f'Invalid report_type. Allowed: {ALLOWED_REPORT_TYPES}')

            # Validate target_type
            if target_type not in ALLOWED_TARGET_TYPES:
                api.abort(400, f'Invalid target_type. Allowed: {ALLOWED_TARGET_TYPES}')

            # Optional target IDs (one required based on target_type)
            table_member_id = data.get('table_member_id')
            question_id = data.get('question_id')
            answer_id = data.get('answer_id')
            signal_id = data.get('signal_id')

            # Validate correct target ID is provided
            target_id_map = {
                'table_member': table_member_id,
                'question': question_id,
                'answer': answer_id,
                'signal': signal_id
            }

            target_id = target_id_map.get(target_type)
            if not target_id:
                api.abort(400, f'target_type "{target_type}" requires {target_type}_id field')

            # Create abuse report
            report = db_models.AbuseReport(
                reporter_user_id=user_id,
                report_type=report_type,
                target_type=target_type,
                reason=reason,
                table_member_id=table_member_id,
                question_id=question_id,
                answer_id=answer_id,
                signal_id=signal_id,
                status='pending',
                created_at=datetime.utcnow()
            )
            db.add(report)
            db_models.transact(db)

            logger.info(
                f"✅ User {user_id} reported {target_type} {target_id} "
                f"(type: {report_type}, report_id: {report.id})"
            )

            return jsonify({
                'report_id': report.id,
                'report_type': report_type,
                'target_type': target_type,
                'status': 'pending',
                'created_at': report.created_at.isoformat()
            }), 201

    @require_auth
    def get(self):
        """
        List abuse reports (admin only).

        SECURITY:
        - Admin check: user.account_type == 1
        - Filters: status, report_type
        - Ordered by created_at descending
        """
        with GetDB() as db:
            # SECURITY: Get user_id from validated JWT
            user_id = user_helpers.get_current_user_id(db)

            # AUTHORIZATION: Admin check
            user = db.query(db_models.User).get(user_id)
            if not user or user.account_type != 1:
                logger.warning(
                    f"❌ Authorization failed: User {user_id} tried to access admin reports "
                    f"but is not admin (account_type: {user.account_type if user else 'None'})"
                )
                api.abort(403, 'Admin access required')

            # Get query params for filtering
            status_filter = request.args.get('status')
            report_type_filter = request.args.get('report_type')

            # Build query
            query = db.query(db_models.AbuseReport)

            # Apply filters
            if status_filter:
                if status_filter not in ALLOWED_REPORT_STATUS:
                    api.abort(400, f'Invalid status. Allowed: {ALLOWED_REPORT_STATUS}')
                query = query.filter(db_models.AbuseReport.status == status_filter)

            if report_type_filter:
                if report_type_filter not in ALLOWED_REPORT_TYPES:
                    api.abort(400, f'Invalid report_type. Allowed: {ALLOWED_REPORT_TYPES}')
                query = query.filter(db_models.AbuseReport.report_type == report_type_filter)

            # Order by newest first
            reports = query.order_by(db_models.AbuseReport.created_at.desc()).all()

            # Format response with reporter and target details
            result = []
            for r in reports:
                # Get reporter details
                reporter = db.query(db_models.User).get(r.reporter_user_id)

                # Get target details based on target_type
                target_details = {}
                if r.target_type == 'table_member' and r.table_member_id:
                    connection = db.query(db_models.TableConnection).get(r.table_member_id)
                    if connection:
                        target_user = db.query(db_models.User).get(connection.table_member_user_id)
                        target_details = {
                            'connection_id': connection.id,
                            'target_user_id': connection.table_member_user_id,
                            'target_user_name': target_user.display_name or target_user.name if target_user else 'Unknown'
                        }
                elif r.target_type == 'question' and r.question_id:
                    question = db.query(db_models.TableQuestion).get(r.question_id)
                    if question:
                        target_details = {
                            'question_id': question.id,
                            'template_id': question.template_id,
                            'asker_user_id': question.asker_user_id
                        }
                elif r.target_type == 'answer' and r.answer_id:
                    answer = db.query(db_models.TableAnswer).get(r.answer_id)
                    if answer:
                        target_details = {
                            'answer_id': answer.id,
                            'answerer_user_id': answer.answerer_user_id,
                            'question_id': answer.question_id
                        }
                elif r.target_type == 'signal' and r.signal_id:
                    signal = db.query(db_models.SafetySignal).get(r.signal_id)
                    if signal:
                        target_details = {
                            'signal_id': signal.id,
                            'user_id': signal.user_id,
                            'restaurant_id': signal.restaurant_id
                        }

                result.append({
                    'report_id': r.id,
                    'reporter_user_id': r.reporter_user_id,
                    'reporter_email': reporter.email if reporter else 'Unknown',
                    'reporter_name': reporter.display_name or reporter.name if reporter else 'Unknown',
                    'report_type': r.report_type,
                    'target_type': r.target_type,
                    'target_details': target_details,
                    'reason': r.reason,
                    'status': r.status,
                    'created_at': r.created_at.isoformat(),
                    'reviewed_at': r.reviewed_at.isoformat() if r.reviewed_at else None
                })

            logger.info(f"✅ Admin user {user_id} listed {len(result)} abuse reports")

            return jsonify({
                'reports': result,
                'count': len(result)
            })


# ============================================================================
# FAMILY MANAGEMENT API
# ============================================================================

@api_namespace.route('/family/members')
class FamilyMemberList(Resource):
    @require_auth
    def get(self):
        """List all family members for the authenticated user"""
        with GetDB() as db:
            user_id = user_helpers.get_current_user_id(db)
            members = db.query(db_models.FamilyMember).filter_by(parent_user_id=user_id).all()
            
            result = []
            for member in members:
                # Get allergies for this member
                allergies = []
                for allergy in member.allergies:
                    allergies.append({
                        'id': allergy.id,
                        'ingredient': allergy.ingredient,
                        'restriction_type': allergy.restriction_type,
                        'severity': allergy.severity,
                        'notes': allergy.notes
                    })
                
                result.append({
                    'id': member.id,
                    'name': member.name,
                    'age': member.age,
                    'relationship': member.relationship,
                    'photo_url': member.photo_url,
                    'emergency_contact': member.emergency_contact,
                    'allergies': allergies,
                    'created_at': member.created_at.isoformat() if member.created_at else None
                })

            return result

    @require_auth
    def post(self):
        """Add a new family member"""
        data = request.get_json()

        if not data or not data.get('name'):
            return {'message': 'Name is required'}, 400

        with GetDB() as db:
            user_id = user_helpers.get_current_user_id(db)
            member = db_models.FamilyMember(
                parent_user_id=user_id,
                name=data['name'],
                age=data.get('age'),
                relationship=data.get('relationship', 'child'),
                photo_url=data.get('photo_url'),
                emergency_contact=data.get('emergency_contact')
            )
            db.add(member)
            db_models.transact(db)

            return {
                'id': member.id,
                'name': member.name,
                'age': member.age,
                'relationship': member.relationship,
                'created_at': member.created_at.isoformat() if member.created_at else None
            }, 201


@api_namespace.route('/family/members/<int:member_id>')
class FamilyMemberDetail(Resource):
    @require_auth
    def put(self, member_id):
        """Update a family member"""
        data = request.get_json()

        with GetDB() as db:
            user_id = user_helpers.get_current_user_id(db)
            member = db.query(db_models.FamilyMember).filter_by(
                id=member_id,
                parent_user_id=user_id
            ).first()
            
            if not member:
                return {'message': 'Family member not found'}, 404
            
            # Update fields
            if 'name' in data:
                member.name = data['name']
            if 'age' in data:
                member.age = data['age']
            if 'relationship' in data:
                member.relationship = data['relationship']
            if 'photo_url' in data:
                member.photo_url = data['photo_url']
            if 'emergency_contact' in data:
                member.emergency_contact = data['emergency_contact']
            
            db_models.transact(db)

            return {
                'id': member.id,
                'name': member.name,
                'age': member.age,
                'relationship': member.relationship,
                'updated': True
            }
    
    @require_auth
    def delete(self, member_id):
        """Delete a family member"""
        with GetDB() as db:
            user_id = user_helpers.get_current_user_id(db)
            member = db.query(db_models.FamilyMember).filter_by(
                id=member_id,
                parent_user_id=user_id
            ).first()
            
            if not member:
                return {'message': 'Family member not found'}, 404
            
            db.delete(member)
            db_models.transact(db)

            return {'deleted': True, 'id': member_id}


@api_namespace.route('/family/members/<int:member_id>/allergies')
class FamilyMemberAllergyList(Resource):
    @require_auth
    def post(self, member_id):
        """Add an allergy to a family member"""
        data = request.get_json()

        if not data or not data.get('ingredient'):
            return {'message': 'Ingredient is required'}, 400

        with GetDB() as db:
            user_id = user_helpers.get_current_user_id(db)
            # Verify member belongs to user
            member = db.query(db_models.FamilyMember).filter_by(
                id=member_id,
                parent_user_id=user_id
            ).first()
            
            if not member:
                return {'message': 'Family member not found'}, 404
            
            allergy = db_models.FamilyMemberAllergy(
                family_member_id=member_id,
                ingredient=data['ingredient'],
                restriction_type=data.get('restriction_type', 'Allergy'),
                severity=data.get('severity', 'High'),
                notes=data.get('notes')
            )
            db.add(allergy)
            db_models.transact(db)

            return {
                'id': allergy.id,
                'ingredient': allergy.ingredient,
                'restriction_type': allergy.restriction_type,
                'severity': allergy.severity
            }, 201


@api_namespace.route('/family/members/<int:member_id>/allergies/<int:allergy_id>')
class FamilyMemberAllergyDetail(Resource):
    @require_auth
    def delete(self, member_id, allergy_id):
        """Delete an allergy from a family member"""
        with GetDB() as db:
            user_id = user_helpers.get_current_user_id(db)
            # Verify member belongs to user
            member = db.query(db_models.FamilyMember).filter_by(
                id=member_id,
                parent_user_id=user_id
            ).first()
            
            if not member:
                return {'message': 'Family member not found'}, 404
            
            allergy = db.query(db_models.FamilyMemberAllergy).filter_by(
                id=allergy_id,
                family_member_id=member_id
            ).first()
            
            if not allergy:
                return {'message': 'Allergy not found'}, 404
            
            db.delete(allergy)
            db_models.transact(db)

            return {'deleted': True, 'id': allergy_id}

api.add_namespace(api_namespace)

# SPA routing - serve React app for non-API routes
@app.route('/')
def serve_root():
    return send_from_directory(app.static_folder, 'index.html')

# Serve static assets
@app.route('/<path:path>')
def serve_static(path):
    # Only serve if path doesn't start with 'api' and file exists
    if not path.startswith('api'):
        file_path = os.path.join(app.static_folder, path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return send_from_directory(app.static_folder, path)
        # If not a file, serve index.html for SPA routing
        return send_from_directory(app.static_folder, 'index.html')
    # If path starts with 'api', let Flask-RESTX handle it (will 404 if no match)
    from flask import abort
    abort(404)

# Start the Flask application
if __name__ == '__main__':
    with GetDB() as db:
        # Disabled dummy data fill - using real production data now
        # import testing.dummy_db; testing.dummy_db.fill_db(db)
        pass
        # import IPython; IPython.embed(colors='linux')
    app.run(debug=False, host='0.0.0.0', port=5000)
    # c = llm.Chat(db, 0, 0)
    # import IPython; IPython.embed(colors='linux')
