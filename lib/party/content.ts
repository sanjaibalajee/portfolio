// Shared curated content for the server and the lazily loaded one-phone game.
// No credentials or AI transport belong in this module.
import words from "./data/words.json";
import { imposterOrigin, imposterWords } from "./data/imposter";
import { availability, type Stock } from "./availability";
import type { Card, Game, Rating, Room, Settings } from "./types";
import { normalise } from "./protocol";

const authored: Card[] = [];
function pack(
  game: Game,
  rating: Rating,
  topic: string,
  prompts: string[],
  level = 1,
) {
  for (const prompt of prompts) {
    const family = `${game}:${normalise(prompt)}`;
    authored.push({
      id: family,
      family,
      concepts: [family],
      game,
      rating,
      topic,
      level,
      prompt,
    });
  }
}
pack("psych", "general", "everyday", [
  "The worst possible name for a meditation app.",
  "A terrible thing to hear from your pilot.",
  "The next useless feature your fridge will get.",
  "A museum exhibit dedicated entirely to this group.",
  "The most suspicious item in a shared fridge.",
  "The worst slogan for a five-star hotel.",
  "A terrible excuse for being four hours late.",
  "The name of a superhero whose power is mildly inconvenient.",
  "The warning label this group should come with.",
  "What the office printer would say if it could speak.",
  "A rejected Olympic event everyone here could win.",
  "The title of the documentary about this weekend.",
  "A new law that would immediately get this group arrested.",
  "The most embarrassing achievement to put on a CV.",
  "The one-star review of being an adult.",
  "Something you should never say while holding a clipboard.",
  "A sentence that ruins any wedding speech.",
  "The worst item to discover in a time capsule.",
  "A terrible name for a baby that sounds like a startup.",
  "What your bank account would say in a performance review.",
  "An apology that somehow makes things worse.",
  "A group-chat message that should have stayed in drafts.",
  "The opposite of a motivational quote.",
  "A terrible prize for winning a game show.",
]);
pack("psych", "general", "internet", [
  "The error message your brain shows on Monday.",
  "A startup that absolutely should not receive funding.",
  "A LinkedIn post written by a haunted toaster.",
  "An AI feature nobody asked for.",
  "The most embarrassing browser tab to screen-share.",
  "Your last three brain cells start a podcast. What is it called?",
  "A commit message for the worst decision of your life.",
  "The terms and conditions of being friends with this group.",
  "A CAPTCHA that would defeat everyone here.",
  "The worst push notification to receive at 3 am.",
  "The name of a social network for people who overshare.",
  "An unacceptable reason to ask for someone’s Wi-Fi password.",
]);
pack("psych", "spicy", "relationships", [
  "A red flag someone here would call character development.",
  "The first message in a dating app for extremely tired people.",
  "A breakup text written by customer support.",
  "The worst person to let write your dating profile.",
  "The title of this group’s cancelled reality show.",
  "An excuse for leaving a date that is too honest.",
  "A terrible thing to say when meeting the parents.",
  "The slogan for a gym exclusively for people avoiding their ex.",
  "A notification that would make the whole table go silent.",
  "The most suspicious reason to suddenly learn Italian.",
  "A dating profile bio that is technically honest but deeply worrying.",
  "The official job title of the friend who creates all the drama.",
]);
pack("psych", "adult", "after-hours", [
  "A sex shop rebrands as a very serious startup. What is its slogan?",
  "The worst thing autocorrect could add to a sext.",
  "An extremely unsexy name for a sex toy.",
  "The customer support complaint after a disastrous hookup.",
  "An awkward safe word that would make everyone laugh.",
  "The title of a guide to the morning after a one-night stand.",
  "What your bed would write in its resignation letter.",
  "A terrible name for a dating app for horny procrastinators.",
  "A sentence that instantly ruins the mood.",
  "The fine print on a friends-with-benefits agreement.",
  "The worst playlist title to accidentally cast to the living-room TV.",
  "An extremely corporate way to propose a booty call.",
  "A suspicious item to find in the office Secret Santa.",
  "A terrible opening line at a swingers’ networking event.",
  "The notification you least want on screen during a hookup.",
  "The name of a support group for people who text their ex after midnight.",
  "The worst thing to accidentally send to the family group chat.",
  "A wildly unhelpful review of a honeymoon suite.",
  "A name for a condom brand that inspires absolutely no confidence.",
  "The most awkward thing to hear through thin hotel walls.",
  "The title of a TED talk about terrible bedroom communication.",
  "A polite out-of-office reply to an unsolicited nude.",
  "A painfully honest slogan for a hookup app.",
  "The secret achievement unlocked by an embarrassing walk of shame.",
]);
pack("who", "general", "everyday", [
  "What tiny hill will you absolutely die on?",
  "What is your most irrational fear?",
  "What is the most useless thing you are proud of?",
  "What lie did you believe for far too long?",
  "What is your most oddly specific pet peeve?",
  "What snack could you eat for the rest of your life?",
  "What is your worst impulse purchase?",
  "What would your autobiography be called?",
  "What fictional character are you embarrassingly similar to?",
  "What is your least marketable talent?",
  "What is the weirdest thing in your search history this week?",
  "What is the smallest thing that ruined your day recently?",
  "What song do you know every word to against your will?",
  "What is a harmless secret you have never told this group?",
  "What is your most repeated excuse?",
  "What is the strangest compliment you have received?",
]);
pack("who", "spicy", "relationships", [
  "What is your most ridiculous dating deal-breaker?",
  "What red flag have you previously ignored?",
  "What is the pettiest reason you stopped talking to someone?",
  "What is your most embarrassing failed attempt to impress someone?",
  "What is a message you wish you could unsend?",
  "What is a romantic gesture you secretly find annoying?",
  "What is your worst first-date story in one sentence?",
  "What is your most chaotic almost-relationship?",
]);
pack("who", "adult", "after-hours", [
  "What is the funniest thing that has killed the mood for you?",
  "What is your most embarrassing sexting mishap, without naming anyone?",
  "What is the worst excuse you have used to avoid a hookup?",
  "What is your least sexy turn-on? Keep it brief.",
  "What is the most awkward thing you have forgotten at a hookup’s place?",
  "What is a bedroom-related purchase you immediately regretted?",
  "What is a terrible sex tip you once heard?",
  "What is the most awkward timing for a booty-call text?",
  "What is your most ridiculous post-hookup exit line?",
  "What is an unsexy thing you find unexpectedly attractive?",
  "What is the most absurd nickname someone has used while flirting?",
  "What song would instantly ruin the mood for you?",
  "What is your funniest dating-app misunderstanding?",
  "What is your worst attempt to look seductive?",
]);
pack("brain", "general", "everyday", [
  "Name a thing you always lose.",
  "Name a food that belongs at midnight.",
  "Name a very disappointing superpower.",
  "Name something you pretend to understand.",
  "Name an object that judges you silently.",
  "Name the worst place for a surprise party.",
  "Name something everyone hoards.",
  "Name a celebrity who could narrate this group.",
  "Name a terrible wedding gift.",
  "Name a food you would defend in court.",
  "Name the first thing a ghost would complain about.",
  "Name an animal with middle-management energy.",
  "Name a smell that takes you back.",
  "Name a thing you would ban from group trips.",
  "Name something that feels illegal but isn’t.",
  "Name a place nobody wants to be at 7 am.",
  "Name a sound that causes instant panic.",
  "Name the most overrated household object.",
  "Name something you check twice before leaving.",
  "Name a profession a cat would be good at.",
]);
pack("brain", "general", "internet", [
  "Name a website you open without thinking.",
  "Name a tech product that needs therapy.",
  "Name a word that ruins a meeting.",
  "Name an app you would delete from existence.",
  "Name the most suspicious file name.",
  "Name a password nobody should use.",
  "Name a programmer’s midnight snack.",
  "Name a villain hiding in your notifications.",
]);
pack("brain", "spicy", "relationships", [
  "Name a universal dating red flag.",
  "Name the worst first-date location.",
  "Name a word that ends an argument badly.",
  "Name an obvious sign someone is flirting.",
  "Name a terrible excuse for texting an ex.",
  "Name a romantic movie everyone pretends to like.",
]);
pack("brain", "adult", "after-hours", [
  "Name the least sexy item of clothing.",
  "Name something that ruins a hookup.",
  "Name the worst room for a booty call.",
  "Name an awkward safe word.",
  "Name a song that kills the mood.",
  "Name the most suspicious bedside-table item.",
  "Name a terrible place to leave a hickey.",
  "Name the least convincing sex-toy disguise.",
  "Name an object that should never vibrate unexpectedly.",
  "Name a wildly unsexy pet name.",
  "Name a terrible excuse to leave the morning after.",
  "Name a word that sounds dirty but isn’t.",
  "Name the worst thing to call someone while flirting.",
  "Name a food that should stay out of the bedroom.",
]);
pack("draw", "general", "everyday", [
  "A pigeon attending a job interview.",
  "A wizard stuck in a video meeting.",
  "A cat pretending to work from home.",
  "A dinosaur making instant noodles.",
  "A robot trying to parallel park.",
  "A ghost afraid of its own reflection.",
  "A shark on a first date.",
  "An astronaut who forgot their keys.",
  "A frog running a five-star hotel.",
  "A duck having a midlife crisis.",
  "A birthday cake fleeing a party.",
  "A hamster giving a TED talk.",
  "A pirate doing customer support.",
  "A fridge judging a midnight snack.",
  "A dog running for president.",
  "A toaster experiencing burnout.",
  "A plant demanding a pay rise.",
  "A vampire at the dentist.",
  "An octopus learning to knit.",
  "A raccoon directing traffic.",
  "A snail late for its wedding.",
  "A penguin performing stand-up comedy.",
  "A superhero stuck in a revolving door.",
  "A haunted washing machine.",
]);
pack("draw", "spicy", "relationships", [
  "A red flag on a romantic date.",
  "A breakup conducted by carrier pigeon.",
  "A dating profile written by a fish.",
  "A marriage proposal at the worst possible moment.",
  "A heart getting ghosted by a phone.",
  "A wedding cake filing for divorce.",
]);
pack("draw", "adult", "after-hours", [
  "A walk of shame in a dinosaur costume.",
  "A bed submitting a noise complaint.",
  "A bra fleeing a washing machine.",
  "A condom being interviewed for a job.",
  "A romantic mood destroyed by a fire alarm.",
  "A sext accidentally sent to a printer.",
  "A rooster advertising a dating app.",
  "A vibrator disguised as a very serious trophy.",
  "A hotel wall wearing noise-cancelling headphones.",
  "A booty call answered by a robot receptionist.",
  "A cupid with a hangover.",
  "A safe word written on an enormous billboard.",
]);
pack(
  "psych",
  "general",
  "internet",
  [
    "A privacy policy written by someone who knows all your secrets.",
    "The incident report after your brain deploys to production on a Monday.",
    "A very polite email from the demon living in your calendar.",
    "An app update that accidentally fixes your entire personality.",
    "The premium subscription tier for being friends with this group.",
    "A code review comment on a disastrous life choice.",
  ],
  2,
);
pack(
  "psych",
  "general",
  "everyday",
  [
    "Write the final line of a resignation letter from the concept of time.",
    "A conspiracy theory invented by your left sock.",
    "The opening sentence of a detective novel where the crime is oversharing.",
    "A brutally honest mission statement for the human species.",
    "The footnote on this group’s Wikipedia scandal.",
    "The acceptance speech for a Nobel Prize in making things awkward.",
  ],
  3,
);
pack(
  "psych",
  "adult",
  "after-hours",
  [
    "A changelog for a hookup app that has become self-aware.",
    "A project post-mortem for a spectacularly unsuccessful booty call.",
    "The quarterly earnings report of a very embarrassed sex shop.",
    "The confidentiality clause in a terrible friends-with-benefits contract.",
  ],
  2,
);
pack(
  "psych",
  "adult",
  "after-hours",
  [
    "Write an academic paper title about the walk of shame.",
    "A cease-and-desist letter from your bedroom playlist.",
    "A corporate rebrand for the phrase “you up?”",
    "The final slide in a very unsuccessful presentation titled “Why You Should Hook Up With Me”.",
  ],
  3,
);
pack(
  "brain",
  "general",
  "everyday",
  [
    "Name a word that belongs in both a dating profile and a police report.",
    "Name a household object with villain energy.",
    "Name a place where silence is more stressful than noise.",
    "Name an animal that would absolutely commit tax fraud.",
  ],
  2,
);
pack(
  "brain",
  "general",
  "internet",
  [
    "Name a programming concept that describes this group.",
    "Name a word that could ruin both a wedding and a product launch.",
    "Name a file extension that sounds like a terrible pet name.",
    "Name a job title that a ghost would put on LinkedIn.",
  ],
  3,
);
pack(
  "brain",
  "adult",
  "after-hours",
  [
    "Name a word that fits both a board meeting and an awkward hookup.",
    "Name a bedroom accessory that could pass as office equipment.",
  ],
  2,
);
pack(
  "brain",
  "adult",
  "after-hours",
  [
    "Name a corporate euphemism for a booty call.",
    "Name a networking term that also sounds like terrible flirting.",
  ],
  3,
);
pack(
  "who",
  "general",
  "everyday",
  [
    "What extremely specific situation brings out your competitive side?",
    "What is a harmless thing you have been pretending to enjoy?",
    "What is the strangest rule you would introduce if you ran this group?",
    "What is a small social interaction you still overthink?",
  ],
  2,
);
pack(
  "who",
  "general",
  "everyday",
  [
    "What would the opening line of your villain manifesto be?",
    "What would your most embarrassing memory be called as a peer-reviewed paper?",
    "What is your least defensible but completely harmless opinion?",
    "What is a weirdly specific skill you could give a ten-minute lecture on?",
  ],
  3,
);
pack(
  "who",
  "adult",
  "after-hours",
  [
    "What would the corporate performance review of your flirting say?",
    "What is the least romantic reason you have ever had a crush?",
  ],
  2,
);
pack(
  "who",
  "adult",
  "after-hours",
  [
    "What is the title of the academic paper about your most awkward date?",
    "What would a one-star review of your worst attempt at seduction say?",
  ],
  3,
);
pack(
  "draw",
  "general",
  "everyday",
  [
    "A courtroom where a sandwich is on trial for being a soup.",
    "An octopus conducting an orchestra of alarm clocks.",
    "A dragon running a tiny bakery during a rainstorm.",
    "A raccoon stealing the moon with a shopping trolley.",
  ],
  2,
);
pack(
  "draw",
  "general",
  "internet",
  [
    "A server room flooded with literal cookies while a firewall dragon panics.",
    "A recursive painting of a robot painting a robot painting a cat.",
    "A password manager hosting a witness-protection programme for punctuation.",
    "A software bug giving a press conference on the back of a giant keyboard.",
  ],
  3,
);
pack(
  "draw",
  "adult",
  "after-hours",
  [
    "A dating app holding a board meeting with a broken heart and a vibrator.",
    "A walk of shame interrupted by a marching band.",
  ],
  2,
);
pack(
  "draw",
  "adult",
  "after-hours",
  [
    "A courtroom where a bedroom playlist sues a fire alarm for ruining the mood.",
    "A tiny Cupid conducting a corporate audit of a disastrously unromantic hotel room.",
  ],
  3,
);

const pairs: [Rating, string, string, string, string][] = [
  [
    "general",
    "everyday",
    "How many alarms do you set in the morning?",
    "How many meals could you eat in a day?",
    "number",
  ],
  [
    "general",
    "everyday",
    "Name something you would rescue from a fire.",
    "Name something you would happily throw away.",
    "object",
  ],
  [
    "general",
    "food",
    "Name a food you would eat every day.",
    "Name a food you would never order.",
    "food",
  ],
  [
    "general",
    "travel",
    "Name a city you would honeymoon in.",
    "Name a city you would send your worst enemy to.",
    "city",
  ],
  [
    "general",
    "screen",
    "Name an actor who should play you in a film.",
    "Name an actor who would play a convincing villain.",
    "actor",
  ],
  [
    "general",
    "everyday",
    "How long could you survive without your phone, in hours?",
    "How long was your longest nap, in hours?",
    "hours",
  ],
  [
    "general",
    "food",
    "Name a food that is better cold.",
    "Name a food that absolutely must be hot.",
    "food-temperature",
  ],
  [
    "general",
    "everyday",
    "Name an animal you would keep as a pet.",
    "Name an animal you would flee from.",
    "animal",
  ],
  [
    "general",
    "internet",
    "Name an app you could not live without.",
    "Name an app you would ban forever.",
    "app",
  ],
  [
    "general",
    "everyday",
    "How old did you feel when you woke up today?",
    "At what age should people retire?",
    "age",
  ],
  [
    "general",
    "travel",
    "Name something you always pack for a trip.",
    "Name something you always forget on a trip.",
    "packing",
  ],
  [
    "general",
    "food",
    "Name a food that describes your personality.",
    "Name a food that describes your worst enemy.",
    "food-personality",
  ],
  [
    "general",
    "everyday",
    "Name something that makes you feel rich.",
    "Name something that makes you feel broke.",
    "wealth-object",
  ],
  [
    "general",
    "screen",
    "Name a film you could watch repeatedly.",
    "Name a film you would walk out of.",
    "film",
  ],
  [
    "spicy",
    "relationships",
    "Rate your flirting ability from 1 to 10.",
    "Rate your ability to spot a liar from 1 to 10.",
    "rating",
  ],
  [
    "spicy",
    "relationships",
    "Name a romantic first-date location.",
    "Name a place you would end a relationship.",
    "date-location",
  ],
  [
    "spicy",
    "relationships",
    "How many minutes late is acceptable for a date?",
    "How many minutes should a bad date last?",
    "date-minutes",
  ],
  [
    "spicy",
    "relationships",
    "Name a celebrity you would date.",
    "Name a celebrity you would never trust.",
    "celebrity",
  ],
  [
    "adult",
    "after-hours",
    "Name something that instantly sets the mood.",
    "Name something that instantly ruins the mood.",
    "mood",
  ],
  [
    "adult",
    "after-hours",
    "Name the worst place for a hickey.",
    "Name the best place for a tattoo.",
    "body-location",
  ],
  [
    "adult",
    "after-hours",
    "Name something you would bring to a hookup.",
    "Name something you would bring to meet the parents.",
    "date-item",
  ],
  [
    "adult",
    "after-hours",
    "Name a terrible safe word.",
    "Name a terrible pet name.",
    "awkward-word",
  ],
  [
    "adult",
    "after-hours",
    "Name a song for a sexy playlist.",
    "Name a song for a funeral playlist.",
    "song",
  ],
  [
    "adult",
    "after-hours",
    "Name a reason to leave the morning after.",
    "Name a reason to call in sick.",
    "exit-excuse",
  ],
  [
    "adult",
    "after-hours",
    "Name something awkward to find under a bed.",
    "Name something awkward to find in your office desk.",
    "awkward-item",
  ],
  [
    "adult",
    "after-hours",
    "Name the least sexy item of clothing.",
    "Name something you would wear to impress a date.",
    "clothing",
  ],
  [
    "adult",
    "after-hours",
    "Name a place where you should never send a sext.",
    "Name a place where you should never take a work call.",
    "phone-location",
  ],
  [
    "adult",
    "after-hours",
    "Name a terrible disguise for a sex toy.",
    "Name a terrible Secret Santa gift.",
    "disguise",
  ],
];
pairs.forEach(([rating, topic, prompt, other, domain]) =>
  authored.push({
    id: `outlier-${domain}`,
    family: `outlier-${domain}`,
    concepts: [`outlier:${domain}`],
    game: "outlier",
    rating,
    topic,
    prompt,
    other,
    level: [
      "food-personality",
      "wealth-object",
      "phone-location",
      "disguise",
      "song",
      "clothing",
    ].includes(domain)
      ? 2
      : 1,
  }),
);
for (const [prompt, other, domain] of [
  [
    "Name a word that describes your sense of humour.",
    "Name a word that describes your search history.",
    "self-description",
  ],
  [
    "Rate your ability to keep a secret from 1 to 10.",
    "Rate your ability to invent an excuse from 1 to 10.",
    "social-skills",
  ],
  [
    "Name an object that represents your love life.",
    "Name an object that represents your work ethic.",
    "metaphor-object",
  ],
])
  authored.push({
    id: `outlier-${domain}`,
    family: `outlier-${domain}`,
    concepts: [`outlier:${domain}`],
    game: "outlier",
    topic: "relationships",
    rating: "spicy",
    level: 3,
    prompt,
    other,
  });
const adultWords = [
  "Walk of shame|A morning departure",
  "Booty call|A late invitation",
  "Friends with benefits|An arrangement",
  "Hickey|A temporary mark",
  "Safe word|A boundary",
  "Sex toy|An accessory",
  "Lingerie|A wardrobe choice",
  "Condom|A precaution",
  "One-night stand|A short connection",
  "Sexting|A conversation",
  "Strip poker|A card game",
  "Thin hotel walls|An architectural problem",
  "Bedhead|A morning look",
  "Thirst trap|A social post",
  "Handcuffs|An accessory",
  "Vibrator|A device",
  "Cuffing season|A time of year",
  "Bedroom playlist|A soundtrack",
  "Shower for two|A scheduling problem",
  "Forgotten underwear|An awkward discovery",
  "Double entendre|A figure of speech",
  "Blindfold|A fabric accessory",
  "Aftercare|A thoughtful gesture",
  "Situationship|A relationship status",
];
for (const w of adultWords) {
  const [secret, hint] = w.split("|");
  authored.push({
    id: `adult-word-${normalise(secret)}`,
    family: `word-${normalise(secret)}`,
    concepts: [`word:${normalise(secret).replaceAll(" ", "-")}`],
    game: "imposter",
    rating: "adult",
    topic: "after-hours",
    level: 1,
    prompt: "Give one clue. Keep the word secret.",
    secret,
    hint,
  });
}
const facts: [string, string, string, string][] = [
  [
    "What shape is wombat poo?",
    "Cubes",
    "https://hu.gatech.edu/wp-content/uploads/2021/01/Hu21-wombat.pdf",
    "everyday",
  ],
  [
    "Which planet has a day longer than its year?",
    "Venus",
    "https://science.nasa.gov/venus/venus-facts/",
    "everyday",
  ],
  [
    "What was the first item scanned at a supermarket checkout in 1974?",
    "A packet of Wrigley’s chewing gum",
    "https://www.smithsonianmag.com/innovation/history-bar-code-180956704/",
    "food",
  ],
  [
    "What does the M in M&M’s stand for? Name both surnames.",
    "Mars and Murrie",
    "https://www.history.com/articles/the-wartime-origins-of-the-mm",
    "food",
  ],
  [
    "What was the original name of the programming language Java?",
    "Oak",
    "https://docs.oracle.com/javase/specs/jls/se6/html/j.preface.html",
    "internet",
  ],
  [
    "What animal appears on the Firefox logo?",
    "A fox",
    "https://blog.mozilla.org/en/firefox/the-fox-is-still-in-the-firefox-logo/",
    "internet",
  ],
  [
    "Which country gave the Statue of Liberty to the United States?",
    "France",
    "https://www.nps.gov/articles/000/statue-of-liberty-national-monument-world-heritage-site.htm",
    "travel",
  ],
  [
    "Which part of an octopus contains most of its neurons?",
    "Its arms",
    "https://education.nationalgeographic.org/resource/animals-101-octopuses/",
    "everyday",
  ],
  [
    "What colour are the sunsets on Mars near the Sun?",
    "Blue",
    "https://science.nasa.gov/resource/color-variations-in-the-sky-at-sunset/",
    "everyday",
  ],
  [
    "What was the first feature-length animated film released by Disney?",
    "Snow White and the Seven Dwarfs",
    "https://d23.com/a-to-z/snow-white-and-the-seven-dwarfs-film/",
    "screen",
  ],
  [
    "What was Nintendo originally established to manufacture?",
    "Playing cards",
    "https://www.nintendo.com/en-gb/Hardware/Nintendo-History/Nintendo-History-625945.html",
    "internet",
  ],
  [
    "Which animal has three hearts and blue blood?",
    "An octopus",
    "https://education.nationalgeographic.org/resource/animals-101-octopuses/",
    "everyday",
  ],
];
facts.forEach(([prompt, secret, source, topic], i) =>
  authored.push({
    id: `fact-${i}`,
    family: `fact:${normalise(prompt)}`,
    concepts: [`fact:${normalise(prompt)}`],
    game: "bluff",
    rating: "general",
    topic,
    level: [0, 2, 3, 7].includes(i) ? 3 : [4, 8, 10].includes(i) ? 2 : 1,
    prompt,
    secret,
    source,
  }),
);

export const catalogue: Card[] = [...(words as Card[]), ...authored, ...imposterWords];
export function eligibleCards(
  room: Room,
  game?: Game,
  includeUsed = false,
): Card[] {
  const s = room.settings;
  // Audience settings mix in lower-rated content; adult never means every round is sexual.
  const ranks: Record<Rating, number> = { general: 0, spicy: 1, adult: 2 };
  const history = new Set(room.history);
  return [...catalogue, ...room.custom].filter(
    (c) =>
      (!game || c.game === game) &&
      (s.game === "mix" || c.game === s.game) &&
      ranks[c.rating] <= ranks[s.rating] &&
      c.level <= s.level &&
      (s.topic === "all" ||
        c.topic === s.topic ||
        (s.lore && c.topic === "group-lore")) &&
      (includeUsed ||
        (!history.has(c.family) && !c.concepts.some((x) => history.has(x)))),
  );
}
export function contentStock(room: Pick<Room, "custom" | "history">): Stock[] {
  const history = new Set(room.history);
  const groups = new Map<string, Stock>();
  for (const c of [...catalogue, ...room.custom]) {
    const key = `${c.game}:${c.topic}:${c.rating}:${c.level}`;
    const row = groups.get(key) || {
      game: c.game,
      topic: c.topic,
      rating: c.rating,
      level: c.level,
      total: 0,
      fresh: 0,
    };
    row.total++;
    if (!history.has(c.family) && !c.concepts.some((x) => history.has(x)))
      row.fresh++;
    groups.set(key, row);
  }
  return [...groups.values()];
}
export function selectCard(
  room: Room,
  random: () => number,
  players = 3,
): Card | undefined {
  let pool = eligibleCards(room);
  if (
    !availability(
      contentStock(room),
      { ...room.settings, game: "draw" },
      players,
    ).fresh
  )
    pool = pool.filter((c) => c.game !== "draw");
  if (!pool.length) return;
  if (room.settings.game === "mix") {
    const ids = [...new Set(pool.map((c) => c.game))];
    const choices =
      ids.length > 1 ? ids.filter((id) => id !== room.lastGame) : ids;
    const g = choices[Math.floor(random() * choices.length)];
    pool = pool.filter((c) => c.game === g);
  }
  // Choose the audience mix independently of the relative sizes of the word banks.
  const featured = pool.filter((c) => c.rating === room.settings.rating);
  const lighter = pool.filter((c) => c.rating !== room.settings.rating);
  if (featured.length && lighter.length)
    pool = random() < 0.55 ? featured : lighter;
  if (
    room.settings.lore &&
    pool.some((c) => c.topic === "group-lore") &&
    random() < 0.6
  )
    pool = pool.filter((c) => c.topic === "group-lore");
  // Keep the new clue-friendly words in regular rotation alongside the full bank.
  if (pool[0]?.game === "imposter" && !room.settings.lore) {
    const curated = pool.filter((c) => c.origin === imposterOrigin);
    if (curated.length && random() < 0.6) pool = curated;
  }
  return pool[Math.floor(random() * pool.length)];
}
