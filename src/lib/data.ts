export const CLIENT_CONFIG = {
  id: 'DEEPAK_001',
  name: 'Deepak',
  restTimer: 105,
  hiitWork: 35,
  hiitRest: 25,
};

export const QUOTES = [
  "Every rep you complete today is a promise kept to yourself.",
  "Strength isn't built when it's easy — it's forged when you push through anyway.",
  "Your body will thank you in 10 years for what you do today.",
  "Consistency beats intensity. Show up, even when you don't feel like it.",
  "The iron never lies. It tells you exactly who you are.",
  "You're not training for a day. You're training for a lifetime.",
  "Progress is measured in reps, not perfection.",
  "Every workout is a brick. Keep stacking them.",
  "The hardest part is starting. You're already past that.",
  "Your future self is watching. Make them proud.",
  "Discipline is doing what needs to be done, even when you don't want to.",
  "The weight on the bar is nothing compared to the weight you're carrying. Lift it anyway.",
  "You didn't come this far to only come this far.",
  "Build the body that carries you through life with strength and dignity.",
  "This is not about looking good. This is about lasting long.",
  "Every set is a choice to be better than yesterday.",
  "The gym is where excuses die and results are born.",
  "Pain is temporary. Quitting lasts forever.",
  "You're building armor against aging. Rep by rep.",
  "The only bad workout is the one you didn't do.",
  "Your muscles don't care about your mood. They only respond to effort.",
  "This isn't vanity. This is survival.",
  "Strong body, strong mind, strong life.",
  "You don't have to be great to start, but you have to start to be great.",
  "The voice that says you can't is a liar.",
  "Every drop of sweat is an investment in your future.",
  "You're not competing with anyone. You're better than you were last week.",
  "The only limit is the one you set yourself.",
  "Your body is the one thing you'll carry your entire life. Treat it like gold.",
  "Lift heavy. Live longer.",
  "This is your time. Own it.",
  "You're rewriting your story, one workout at a time.",
  "Champions train. Legends recover. You're doing both.",
  "The burn you feel today is the strength you'll have tomorrow.",
  "Age is just a number. Strength is a choice.",
  "Every workout is a deposit in your health bank.",
  "The only failure is not trying.",
  "You're building a machine that lasts.",
  "This workout is for the you who needs it tomorrow.",
  "Be the version of yourself that never quits.",
  "Strong is not a body type. It's a decision.",
  "You're writing your legacy in the gym.",
  "The body achieves what the mind believes.",
  "This is your arena. Dominate it.",
  "You're not just lifting weights. You're lifting your life.",
  "The pain you feel today will be the pride you feel tomorrow.",
  "You're too committed to quit now.",
  "Build yourself so strong that nothing can break you.",
  "The iron respects effort, not excuses.",
  "You're not here to be average.",
  "Every workout is a victory over the version of you that wanted to skip.",
  "Strength is earned, not given.",
  "The only way out is through.",
  "You're stronger than you think. Prove it.",
  "Every set is a promise to keep going.",
  "The gym is your therapy. The weights are your medicine.",
  "You're building a body that won't quit on you.",
  "This is not punishment. This is progress.",
  "Every workout is a step toward the best version of you.",
  "You're not just training. You're transforming.",
  "Every rep is a vote for the person you want to become.",
  "The only way to fail is to stop trying.",
  "You're stronger than your excuses.",
  "Every workout is a battle won.",
  "This is your investment in yourself.",
  "The gym is where you become unstoppable.",
  "Every rep is a step toward greatness.",
  "This is your time to prove what you're made of.",
  "The only limit is the one you accept.",
  "You're stronger than you were last time. Keep going.",
  "Every workout is a promise to yourself.",
  "You're not just building muscle. You're building character.",
  "The only way forward is through the pain.",
  "Every rep is a step closer to the person you want to be.",
  "You're not just training. You're evolving.",
  "Every workout is a testament to your commitment.",
  "The only way to grow is to push beyond comfort.",
  "You're stronger than your doubts.",
  "Every rep is a declaration of war against mediocrity.",
  "The only way to win is to keep showing up.",
  "You're stronger than your fears.",
  "Every workout is a step toward invincibility.",
  "This is your moment to be unstoppable.",
  "The only way to succeed is to refuse to quit.",
  "You're stronger than your setbacks.",
  "Every rep is a vote for strength over weakness.",
  "The only way to improve is to push past your limits.",
  "Every workout is a rebellion against comfort.",
  "You're stronger than the person you were when you walked in.",
  "Every rep is a step toward mastery of yourself.",
  "The only way to grow is to push past your perceived limits.",
  "You're stronger than any challenge that comes your way.",
  "Every workout is a step toward becoming a force.",
  "The only way to win is to never accept defeat.",
  "You're stronger than your past. Prove it.",
  "Every rep is a declaration of your commitment to excellence.",
  "The only way to succeed is to refuse to settle for less.",
  "You're stronger than the version of you that wanted to quit.",
  "Every workout is a step toward becoming invincible.",
  "The only way to grow is to embrace the grind every single day.",
  "You're stronger than any obstacle. Face it.",
  "Every rep is a vote for the warrior within.",
  "The only way to improve is to push beyond what you thought possible.",
  "You're stronger than any excuse you could ever make.",
  "Every workout is a step toward becoming unshakable.",
  "The only way to win is to never stop pushing forward.",
  "You're stronger than you'll ever know. Keep proving it every day.",
  "Every rep is a step toward mastery.",
  "The only way to succeed is to outwork your doubts.",
  "Every workout is a step toward becoming elite.",
  "The only way to grow is to push past your comfort zone.",
  "You're stronger than any challenge.",
  "Every rep is a declaration of your strength and will.",
  "The only way to win is to never give up.",
  "You're stronger than yesterday. Do it again.",
  "Every rep is a vote for resilience.",
  "The only way to grow is to embrace the struggle.",
  "Every workout is a step toward becoming unbreakable.",
  "The only way to win is to never accept less than your best.",
  "You're stronger than your past failures.",
  "Every rep is a step toward mastery of yourself.",
  "The only way to improve is to push through discomfort.",
  "Every workout is a step toward becoming a force of nature.",
  "The only way to succeed is to keep moving forward.",
  "You're stronger than your circumstances.",
  "Every rep is a declaration of your will to win.",
  "The only way to grow is to push beyond your limits.",
  "Every workout is a step toward becoming invincible.",
  "The only way to win is to never stop fighting for yourself.",
  "You're stronger than you've ever been. Prove it again tomorrow."
];

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
}

export interface Day {
  key: string;
  label: string;
  type: string;
  focus: string;
  exs: Exercise[];
}

export const DAYS: Day[] = [
  { key: 'mon', label: 'Mon', type: 'Push', focus: 'Chest · Shoulders · Triceps',
    exs: [
      { id: 'm1', name: 'Flat Barbell Bench Press', sets: 3, reps: '10-12' },
      { id: 'm2', name: 'Incline Dumbbell Press', sets: 3, reps: '12' },
      { id: 'm3', name: 'Cable Chest Fly (Mid)', sets: 3, reps: '12-15' },
      { id: 'm4', name: 'Seated DB Shoulder Press', sets: 3, reps: '12' },
      { id: 'm5', name: 'Cable Lateral Raise', sets: 3, reps: '15' },
      { id: 'm6', name: 'Tricep Rope Pushdown', sets: 3, reps: '12-15' },
      { id: 'm7', name: 'Overhead Tricep Extension (Cable)', sets: 2, reps: '12-15' },
      { id: 'm8', name: 'Ab Wheel Rollout', sets: 2, reps: '8-10' },
    ]},
  { key: 'tue', label: 'Tue', type: 'Pull', focus: 'Back · Biceps · Rear Delts',
    exs: [
      { id: 't1', name: 'Lat Pulldown (Wide Grip)', sets: 3, reps: '12' },
      { id: 't2', name: 'Seated Cable Row (Neutral Grip)', sets: 3, reps: '12' },
      { id: 't3', name: 'Single-Arm Dumbbell Row', sets: 3, reps: '12' },
      { id: 't4', name: 'Cable Face Pull', sets: 3, reps: '15' },
      { id: 't5', name: 'Straight-Arm Cable Pulldown', sets: 2, reps: '12-15' },
      { id: 't6', name: 'Barbell Curl', sets: 3, reps: '12' },
      { id: 't7', name: 'Hammer Curl (Dumbbell)', sets: 2, reps: '12-15' },
      { id: 't8', name: 'Dead Bug (Core)', sets: 3, reps: '8 each side' },
    ]},
  { key: 'wed', label: 'Wed', type: 'Legs', focus: 'Quads · Glutes · Hamstrings (Back Safe)',
    exs: [
      { id: 'w1', name: 'Goblet Squat (Dumbbell)', sets: 3, reps: '12-15' },
      { id: 'w2', name: 'Bulgarian Split Squat', sets: 3, reps: '8 each leg' },
      { id: 'w3', name: 'Hip Thrust (Barbell)', sets: 3, reps: '12-15' },
      { id: 'w4', name: 'Lying Hamstring Curl (Machine)', sets: 3, reps: '12-15' },
      { id: 'w5', name: 'Cable Kickback (Glute Focus)', sets: 3, reps: '12 each leg' },
      { id: 'w6', name: 'Leg Extension (Machine)', sets: 3, reps: '15' },
      { id: 'w7', name: 'Standing Calf Raise', sets: 3, reps: '15-20' },
      { id: 'w8', name: 'Bird Dog (Lower Back Rehab)', sets: 3, reps: '10 each side' },
    ]},
  { key: 'thu', label: 'Thu', type: 'Core', focus: 'Abs · Core · HIIT Cardio',
    exs: [
      { id: 'th1', name: 'Treadmill Incline Walk (Warm-Up)', sets: 1, reps: '12 min' },
      { id: 'th2', name: 'Cable Crunch (Kneeling)', sets: 3, reps: '15' },
      { id: 'th3', name: 'Hanging Knee Raise', sets: 3, reps: '10-12' },
      { id: 'th4', name: 'Plank Hold', sets: 3, reps: '40-50 sec' },
      { id: 'th5', name: 'Russian Twist (Weighted)', sets: 3, reps: '16 total' },
      { id: 'th6', name: 'Reverse Crunch', sets: 3, reps: '12' },
      { id: 'th7', name: 'Side Plank (Each Side)', sets: 3, reps: '25-35 sec' },
      { id: 'th8', name: 'HIIT: Battle Ropes / Rowing Ergometer', sets: 5, reps: '35s on / 25s off' },
    ]},
  { key: 'fri', label: 'Fri', type: 'Push', focus: 'Upper Hypertrophy · Chest · Shoulders',
    exs: [
      { id: 'f1', name: 'Incline Barbell Bench Press', sets: 3, reps: '10-12' },
      { id: 'f2', name: 'Flat Dumbbell Press', sets: 3, reps: '12' },
      { id: 'f3', name: 'Cable Crossover (Low-to-High)', sets: 3, reps: '12-15' },
      { id: 'f4', name: 'Arnold Press (Dumbbell)', sets: 3, reps: '12' },
      { id: 'f5', name: 'Cable Upright Row', sets: 3, reps: '12-15' },
      { id: 'f6', name: 'Tricep Dips (Assisted or Bodyweight)', sets: 3, reps: '8-10' },
      { id: 'f7', name: 'Skull Crushers (EZ Bar)', sets: 2, reps: '12-15' },
      { id: 'f8', name: 'Stomach Vacuum Hold', sets: 3, reps: '20-25 sec' },
    ]},
  { key: 'sat', label: 'Sat', type: 'Pull', focus: 'Full Body Strength + Glute Focus',
    exs: [
      { id: 's1', name: 'Pull-Ups (Assisted if needed)', sets: 3, reps: '5-8' },
      { id: 's2', name: 'T-Bar Row', sets: 3, reps: '12' },
      { id: 's3', name: 'Cable Pull-Through (Glute Focus)', sets: 3, reps: '15' },
      { id: 's4', name: 'Good Morning (Light, Controlled)', sets: 3, reps: '12-15' },
      { id: 's5', name: 'Incline Dumbbell Curl', sets: 3, reps: '12' },
      { id: 's6', name: 'Concentration Curl', sets: 2, reps: '12 each arm' },
      { id: 's7', name: 'Ab Rollout (Kneeling)', sets: 3, reps: '10' },
      { id: 's8', name: 'Treadmill / Elliptical Cool-Down', sets: 1, reps: '15 min steady state' },
    ]},
  { key: 'sun', label: 'Sun', type: 'Rest', focus: 'Active Recovery Day', exs: [] },
];

export const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export const TYPE_BADGE: Record<string, string> = {
  Push: 'bp', Pull: 'bl', Legs: 'bg', Core: 'bc', Rest: 'br'
};

export const TYPE_EMOJI: Record<string, string> = {
  Push: '🔥', Pull: '💪', Legs: '🦵', Core: '⚡', Rest: '😴'
};

export function getRandomQuote(usedQuotes: number[]): { quote: string; newUsed: number[] } {
  let used = [...usedQuotes];
  if (used.length >= QUOTES.length) used = [];
  const available = QUOTES.map((_, i) => i).filter(i => !used.includes(i));
  const pick = available[Math.floor(Math.random() * available.length)];
  return { quote: QUOTES[pick], newUsed: [...used, pick] };
}

export function calcVol(exerciseData: { weights?: Record<string, string[]> }): number {
  return Object.values(exerciseData?.weights || {}).reduce((a, sets) =>
    a + sets.reduce((b, w) => b + (parseFloat(w) || 0), 0), 0);
}
