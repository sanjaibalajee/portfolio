import { normalise } from "../protocol";
import type { Card, Rating } from "../types";

export const imposterOrigin = "party-imposter-v1";
export const imposterWords: Card[] = [];

// Familiar enough to clue, specific enough to make bluffing interesting.
// Entries are secret labels, never instructions or imposter hints.
function pack(topic: string, rating: Rating, level: 1 | 2 | 3, words: string[]) {
  for (const secret of words) {
    const concept = normalise(secret).replaceAll(" ", "-");
    imposterWords.push({
      id: `party-word-${concept}`,
      family: `word-${concept}`,
      concepts: [`word:${concept}`],
      game: "imposter",
      topic,
      rating,
      level,
      prompt: "Give one clue. Keep the word secret.",
      secret,
      origin: imposterOrigin,
    });
  }
}

pack("everyday", "general", 1, [
  "Brain freeze", "Wedgie", "Unibrow", "Dad joke", "Rubber chicken",
  "Whoopee cushion", "Bad haircut", "Toilet plunger", "Fart", "Snoring",
  "Hiccups", "Belly button", "Double chin", "Bed hair", "Fake moustache",
  "Awkward silence", "Air guitar", "Baby voice", "Duck face", "Food coma",
]);
pack("everyday", "general", 2, [
  "Goosebumps", "Sleep paralysis", "Muscle memory", "Placebo", "Blind spot",
  "Optical illusion", "Domino effect", "Echo chamber", "False alarm",
  "Urban legend", "Midlife crisis", "Stage fright", "Secondhand embarrassment",
  "Nervous laughter", "Accidental eye contact", "Bathroom acoustics",
  "Phantom phone vibration", "Revolving door", "Panic buying", "Participation trophy",
]);
pack("everyday", "general", 3, [
  "Deja vu", "Mandela effect", "Survivorship bias", "Sunk cost", "Catch-22",
  "Butterfly effect", "Ship of Theseus", "Schrodinger's cat", "Uncanny valley",
  "Cognitive dissonance", "Dunning-Kruger effect", "Imposter syndrome",
  "Confirmation bias", "Analysis paralysis", "Prisoner's dilemma",
  "Self-fulfilling prophecy", "Occam's razor", "Murphy's law", "Freudian slip",
  "Existential crisis",
]);
pack("food", "general", 1, [
  "Five-second rule", "Midnight snack", "Emergency noodles", "Mystery leftovers",
  "Office birthday cake", "Stolen fries", "Sad desk lunch", "Last slice",
]);
pack("food", "general", 2, [
  "Umami", "Sourdough starter", "Molecular gastronomy", "Palate cleanser",
  "Kitchen nightmare", "Bottomless brunch", "Secret menu", "Corkage fee",
  "All-you-can-eat buffet", "Pineapple on pizza", "Revenge baking", "Hangry",
]);
pack("food", "general", 3, [
  "Maillard reaction", "Blind taste test", "Fermentation", "Scoville scale",
  "Truffle oil", "Omakase", "Sous vide", "Amuse-bouche",
]);
pack("internet", "general", 1, [
  "Butt dial", "Pocket selfie", "Accidental reply all", "Caps lock",
  "Muted microphone", "Unsent message", "Screenshot", "Autocorrect fail",
]);
pack("internet", "general", 2, [
  "Doomscrolling", "Rage bait", "Main character energy", "Keyboard warrior",
  "Influencer apology", "Crypto bro", "Reply guy", "Thirsty comment",
  "Fake loading bar", "Typing indicator", "Unskippable ad", "Voice-note essay",
  "Forgotten attachment", "Wrong group chat", "LinkedIn humblebrag", "Cat filter",
]);
pack("internet", "general", 3, [
  "Streisand effect", "Dead internet theory", "Parasocial relationship",
  "Algorithm bubble", "Dark pattern", "Infinite scroll", "Digital footprint",
  "Enshittification", "Reverse image search", "404 error", "Rubber duck debugging",
  "Terms and conditions",
]);
pack("relationships", "general", 1, [
  "Third wheel", "Friend zone", "Crush", "Bad texter", "Awkward hug",
  "Matching outfits", "Double date", "Pet name",
]);
pack("relationships", "general", 2, [
  "Ghosting", "Breadcrumbing", "Soft launch", "Hard launch", "The ick",
  "Mixed signals", "Rebound", "Meet-cute", "Green flag", "Backhanded compliment",
  "Oversharing", "Silent treatment", "Flirting with the waiter", "Accidental like",
  "Unfollow", "Read receipt",
]);
pack("relationships", "general", 3, [
  "Attachment style", "Emotional baggage", "Weaponised incompetence",
  "Conflict avoidance", "People pleasing", "Saviour complex", "Boundary setting",
  "Commitment issues", "Romantic projection", "Unspoken expectations",
]);
pack("travel", "general", 1, [
  "Airport sprint", "Middle seat", "Lost luggage", "Tourist trap",
  "Snoring roommate", "Hotel slippers", "Neck pillow", "Overpacked suitcase",
]);
pack("travel", "general", 2, [
  "Jet lag", "Reverse culture shock", "Red-eye flight", "Staycation",
  "Passport panic", "Baggage carousel", "Duty-free perfume", "Hotel buffet",
  "Accidental upgrade", "Missed connection", "Motion sickness", "Room service",
]);
pack("travel", "general", 3, [
  "Schengen visa", "International Date Line", "Carbon offset", "Overtourism",
  "Dark tourism", "Sleeper train", "Currency arbitrage", "Lost in translation",
]);
pack("screen", "general", 1, [
  "Jump scare", "Spoiler", "Plot twist", "Laugh track", "Slow-motion entrance",
  "Bad dubbing", "Fake crying", "Movie marathon",
]);
pack("screen", "general", 2, [
  "Plot armour", "Villain monologue", "Training montage", "Love triangle",
  "Post-credits scene", "Continuity error", "Plot hole", "Unnecessary sequel",
  "Stunt double", "Dramatic zoom", "Reality-show confession", "Bollywood physics",
]);
pack("screen", "general", 3, [
  "Unreliable narrator", "Fourth wall", "Chekhov's gun", "MacGuffin",
  "Red herring", "Deus ex machina", "Bottle episode", "Foreshadowing",
]);

// Explicit vocabulary and adult party humour, kept behind the existing 18+ opt-in.
pack("after-hours", "adult", 1, [
  "Dildo", "Butt plug", "Lube", "Nipple clamps", "Cock ring", "Strap-on",
  "Bondage tape", "Sex swing", "Bullet vibrator", "Love eggs", "Nipple tassels",
  "Edible underwear", "Crotchless underwear", "Fishnet stockings", "Garter belt",
  "Thigh-high boots", "Nude selfie", "Dick pic", "Porn", "Orgasm", "Boner",
  "Blue balls", "Horny", "Fuck buddy", "Dry humping", "Lap dance",
  "Strip tease", "Skinny dipping", "Pole dancing", "Strip club",
  "Morning wood", "Masturbation", "Handjob", "Blowjob", "Quickie", "Threesome",
  "Sixty-nine", "Doggy style", "Missionary", "Reverse cowgirl",
]);
pack("after-hours", "adult", 2, [
  "Edging", "Kink", "Fetish", "BDSM", "Roleplay", "Dominatrix", "Exhibitionism",
  "Voyeurism", "Pillow princess", "Switch", "Praise kink", "Brat", "Pegging",
  "Spanking paddle", "Leather harness", "Bed restraints", "Suction vibrator",
  "Remote-control vibrator", "Body chocolate", "Massage candle", "Silk sheets",
  "Mood lighting", "Post-nut clarity", "Sex hair", "Queef", "Whiskey dick",
  "Carpet burn", "Walk-in interruption", "Broken bed frame", "Hotel mirror",
  "Hookup logistics", "The sock on the door", "Netflix and chill", "Smut",
  "Erotic audiobook", "Dirty talk", "Phone sex", "Cybersex", "Shower sex",
  "Car sex", "Mile-high club", "Makeup sex", "Rebound hookup", "Sex dream",
]);
pack("after-hours", "adult", 3, [
  "Vanilla sex", "Sensory deprivation", "Shibari", "Pleasure mapping",
  "Sexual tension", "Orgasm gap", "Mutual masturbation", "Erotic hypnosis",
  "Chastity cage", "Wand massager", "Sex wedge", "Nipple pasties",
  "Temperature play", "Feather tickler", "Kink checklist", "Bedroom negotiation",
  "Friends-with-benefits contract", "Booty-call curfew", "Post-hookup debrief",
  "Accidental speakerphone sext", "Bluetooth betrayal", "Squeaky mattress",
  "Condom wrapper", "Emergency bedsheet wash", "Vibrator charger",
  "Sex-toy warranty", "Horny on main", "Secret porn tab", "Bedroom stage fright",
  "Safeword amnesia", "Horny jail", "Arousal mismatch", "Erotic fan fiction",
  "Kama Sutra", "Tantric sex", "Orgasm face",
]);
