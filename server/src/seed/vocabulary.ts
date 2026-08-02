export const HOBBIES = [
  'Hiking', 'Photography', 'Cooking', 'Reading', 'Cycling', 'Running', 'Gardening',
  'Painting', 'Chess', 'Yoga', 'Swimming', 'Guitar', 'Piano', 'Baking', 'Climbing',
  'Surfing', 'Skiing', 'Snowboarding', 'Pottery', 'Knitting', 'Woodworking', 'Fishing',
  'Camping', 'Birdwatching', 'Astronomy', 'Calligraphy', 'Origami', 'Sketching',
  'Sculpting', 'Dancing', 'Singing', 'Drumming', 'Violin', 'Poetry', 'Blogging',
  'Podcasting', 'Board games', 'Video games', 'Puzzles', 'Sudoku', 'Crosswords',
  'Archery', 'Fencing', 'Boxing', 'Martial arts', 'Tennis', 'Badminton', 'Squash',
  'Basketball', 'Football', 'Cricket', 'Golf', 'Sailing', 'Kayaking', 'Diving',
  'Travelling', 'Volunteering', 'Beekeeping', 'Brewing', 'Metal detecting',
] as const;

export const NATIONALITIES = [
  'American', 'British', 'Canadian', 'Australian', 'German', 'French', 'Spanish',
  'Italian', 'Dutch', 'Belgian', 'Swiss', 'Austrian', 'Swedish', 'Norwegian',
  'Danish', 'Finnish', 'Icelandic', 'Irish', 'Portuguese', 'Greek', 'Polish',
  'Czech', 'Hungarian', 'Romanian', 'Bulgarian', 'Croatian', 'Serbian', 'Ukrainian',
  'Russian', 'Turkish', 'Israeli', 'Egyptian', 'Moroccan', 'Nigerian', 'Kenyan',
  'South African', 'Indian', 'Pakistani', 'Bangladeshi', 'Chinese', 'Japanese',
  'Korean', 'Thai', 'Vietnamese', 'Brazilian',
] as const;

/**
 * Zipf-ish weights. Uniform sampling would leave all 60 hobbies within noise of
 * each other, which makes a "top 20" list meaningless — the point of the
 * sidebar is that some values are genuinely more common than others.
 */
export function zipfWeights(n: number): number[] {
  return Array.from({ length: n }, (_, i) => 1 / (i + 1));
}

/** Picks an index from `weights` given a uniform sample in [0, 1). */
export function weightedIndex(weights: number[], sample: number): number {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const target = sample * total;
  let accumulated = 0;

  for (let i = 0; i < weights.length; i += 1) {
    accumulated += weights[i] ?? 0;
    if (target < accumulated) return i;
  }
  return weights.length - 1;
}
