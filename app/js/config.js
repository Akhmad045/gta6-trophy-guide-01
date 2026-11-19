// Leonida Nights — shared configuration: grade metadata, kind order, roadmap stages.
// Everything visual in the app (medallion colours, pills, stage names) reads from here,
// so the checklist, the roadmap and the missable view can never disagree with each other.

export const STORAGE_KEY = 'leonida-nights-trophy-guide-v3';
export const DATA_URL = 'data/trophies.json';
export const TOTAL_TROPHIES = 55;

export const GRADE_ORDER = ['platinum', 'gold', 'silver', 'bronze'];

export const GRADE_META = {
  platinum: { label: 'Platinum', plural: 'Platinum', ink: '#eaf6ff', glow: 'rgba(150, 220, 255, .55)' },
  gold: { label: 'Gold', plural: 'Gold', ink: '#ffe9a8', glow: 'rgba(255, 196, 64, .45)' },
  silver: { label: 'Silver', plural: 'Silver', ink: '#eef1f6', glow: 'rgba(200, 212, 228, .4)' },
  bronze: { label: 'Bronze', plural: 'Bronze', ink: '#ffd9b0', glow: 'rgba(230, 140, 70, .4)' },
};

export const KIND_ORDER = ['Story', 'Collectibles', 'Activities', 'World & Feats', 'Completion'];

export const KIND_BLURBS = {
  Story: 'Chapters, named missions and the stranger-strand finales that carry the narrative.',
  Collectibles: 'Sets, spots and registries spread across Leonida — sweep them region by region.',
  Activities: 'Races, ranges, robberies and repeatable feats with PSN counters to fill.',
  'World & Feats': 'One-off moments in the open world: partner plays, odd encounters, quiet scenes.',
  Completion: 'The two bookends of the list — 100% completion and the platinum itself.',
};

export const ROADMAP_STAGES = [
  {
    n: 1,
    title: 'Story First',
    sub: 'Chapters 1–4, the named missions & the finale',
    text: 'Play the story start to finish before grinding anything. Every chapter and named-mission trophy lands here, the map opens as you go, and the finale gold (You Gotta Know When to Get Off) closes the stage. Note VCIA during Hi-Jacked — you will return there in Stage 5.',
  },
  {
    n: 2,
    title: 'Strangers & Chains',
    sub: 'Finish every stranger strand to its final mission',
    text: 'Work each stranger strand end to end — Andy, Kenton, Billy, Randy and Tyrone each end in their own trophy, Bret sends you after a unique animal, and eight finished strands earn the silver Strangers & Freaks. A strand only counts when its final mission is done.',
  },
  {
    n: 3,
    title: 'The Leonida Sweep',
    sub: 'Collectibles, exploration & property',
    text: 'Tour the state region by region: 18 meditation spots, 3 card sets, 100 WAiNK locations, 100 discovered vehicles, all 52 areas, 8 garages and 10 Scooter Bros registrations. These counters reward travel, so combine them into single trips instead of farming any one in place.',
  },
  {
    n: 4,
    title: 'Skill & the Long Grind',
    sub: 'Medals, races, robberies & stunt counters',
    text: 'The skill stage: gold all 42 Shooting Range challenges, win 20 different races and 14 drone courses, complete 250 stunts and 50 challenges, rob 5 bank vaults, an armoured truck and one illegal operation per gang. Bank the easy wins first and let the steppers pace the rest.',
  },
  {
    n: 5,
    title: 'Partners, Money & Cleanup',
    sub: 'Paired feats, cash totals, the watch list & 100%',
    text: 'Finish with the two-hander feats (Hot Together, Retail Therapy), the money totals ($250,000 laundered, $100,000 spent), the five missable-watch moments while their windows are in mind, and the vague one-off world trophies. When the counter reads 54 of 55, A Long Road closes at 100% — and Vice Got a Price! is yours.',
  },
];

export const MISSABLE_NOTE =
  'Honesty note: no official description labels any trophy “missable” outright. The five flags below are a watch list only — each one is reasoned from words quoted verbatim from that trophy’s own official description, and the reasoning is shown on its card. Everything else on the list reads as repeatable or story-guaranteed from its description.';

export const SORT_ORDERS = [
  { id: 'guide', label: 'Guide order' },
  { id: 'grade', label: 'Grade: rarest first' },
  { id: 'name', label: 'Name A–Z' },
  { id: 'remaining', label: 'Unearned first' },
];
