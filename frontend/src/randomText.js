
const PEOPLE = ['Master Yoda', 'Donald Trump', 'Morgan Freeman', 'Captain Jack Sparrow', 'William Shakespeare', 'Dr Seuss', 'Darth Vader', 'Homer Simpson', 'Snoop Dogg', 'Queen Elizabeth II', 'Borat', 'Arnold Schwarzenegger', 'Kermit the Frog', 'Neil DeGrasse Tyson', 'Sherlock Holmes', 'Bugs Bunny'];
const ADJECTIVES = ['Sarcastic', 'Depressed', 'Evil', 'Cynical', 'Happy', 'Birthday', 'SciFi', 'Intrusive', 'Optimistic', 'Pessimistic', 'Energetic', 'Melancholic', 'Annoying', 'Whimsical', 'Mysterious', 'Ecstatic', 'Nostalgic', 'Hilarious', 'Playful', 'Bittersweet', 'Thrilling', 'Chaotic', 'Inspiring', 'Alien', 'Euphoric', 'Terrifying', 'Terrified', 'Psychedelic', 'Impulsive', 'Nosy', 'Dramatic', 'Unpredictable', 'Punny', 'Rhyming', 'Singing', 'Zombie', 'Drunk'];

export function getRandText() {
  let person = PEOPLE[Math.floor(Math.random()*PEOPLE.length)];
  let adj = ADJECTIVES[Math.floor(Math.random()*ADJECTIVES.length)];
  return `${adj} ${person}`
}

export const FOODS = [
  'Peanuts', 'Tree nuts', 'Milk', 'Eggs', 'Soy', 'Wheat', 'Fish', 'Shellfish',
]
export const PREPS = [
  'boiled', 'fried', 'any way', 'sauteed', 'raw',
]

