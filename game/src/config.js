// SOLMAR — open-world crime game. Every tuning knob lives in this file.
export const CFG = {
  // City layout: square blocks of BLOCK, separated by ROAD-wide streets.
  BLOCK: 56,
  ROAD: 16,
  GRID: 8, // road lines per axis
  WORLD: 300, // playable half-extent for x/z clamping
  BEACH_Z: 292, // sand begins here (south edge)
  OCEAN_Z: 380, // water begins here
  // On foot
  WALK_SPEED: 7,
  RUN_SPEED: 11,
  // Driving (arcade handling)
  CAR_ACCEL: 26,
  CAR_BRAKE: 42,
  CAR_REVERSE: 14,
  CAR_TOP_SPEED: 46,
  CAR_TURN: 1.9,
  CAR_GRIP: 7.5,
  // Police
  POLICE_TOP_SPEED: 50,
  POLICE_RAM_DAMAGE: 12,
  WANTED_DECAY_SECONDS: 18,
  // Health and damage
  PLAYER_HEALTH: 100,
  CAR_HEALTH: 100,
  PUNCH_DAMAGE: 34,
  // Money
  START_CASH: 250,
  PUNCH_CASH_MIN: 15,
  PUNCH_CASH_MAX: 60,
  // Palette
  SKY: 0x8ec9ee,
  SUN_COLOR: 0xffe3b3,
  SUN_INTENSITY: 2.4,
  FOG_COLOR: 0x9fc7e8,
  ROAD_COLOR: 0x33363d,
  SIDEWALK_COLOR: 0x9aa0a3,
  SAND_COLOR: 0xe8cf9e,
  OCEAN_COLOR: 0x1d7fb8,
  BUILDING_COLORS: [0xd8c9a8, 0xc9b18a, 0xb7c4cc, 0xe0a37a, 0x9fb8a4, 0xd9a0a0, 0x8fa8c9, 0xe8dcc0],
  CAR_COLORS: [0xc0392b, 0x2471a3, 0xf1c40f, 0x27ae60, 0x8e44ad, 0xe67e22, 0xecf0f1, 0x1abc9c, 0x2c3e50],
  POLICE_COLOR: 0x1c2733,
};

// Centre-line coordinate of each road, one per axis.
export const ROAD_LINES = [];
for (let i = 0; i < CFG.GRID; i++) {
  ROAD_LINES.push((i - (CFG.GRID - 1) / 2) * (CFG.BLOCK + CFG.ROAD));
}

// Named districts, by quadrant and strip.
export const DISTRICTS = [
  { name: 'Old Port', x0: -320, x1: -80, z0: -320, z1: -40 },
  { name: 'Downtown', x0: -80, x1: 100, z0: -320, z1: -40 },
  { name: 'Marina Bay', x0: 100, x1: 320, z0: -320, z1: -40 },
  { name: 'The Palms', x0: -320, x1: -40, z0: -40, z1: 292 },
  { name: 'Solmar Heights', x0: -40, x1: 140, z0: -40, z1: 292 },
  { name: 'Casino Row', x0: 140, x1: 320, z0: -40, z1: 292 },
  { name: 'Solmar Beach', x0: -320, x1: 320, z0: 292, z1: 460 },
];

export function districtAt(x, z) {
  for (const d of DISTRICTS) {
    if (x >= d.x0 && x < d.x1 && z >= d.z0 && z < d.z1) return d.name;
  }
  return 'Solmar';
}

// Ranks, earned as jobs are completed.
export const RANKS = ['Wheelman', 'Runner', 'Hustler', 'Fixer', 'King of Solmar'];

// Mara Voss's four jobs, in order. Each step names a place to reach
// (or a thing to do there); the coordinates live in missions.js.
export const JOBS = [
  {
    id: 'courier',
    title: 'Courier Run',
    blurb: 'Mara Voss needs a package moved across town. No questions, no stops.',
    reward: 400,
    wanted: 0,
    steps: [
      { type: 'pickup', place: 'marina', text: 'Pick up the package at the Marina' },
      { type: 'deliver', place: 'palms', text: 'Deliver it to The Palms hotel' },
    ],
  },
  {
    id: 'getaway',
    title: 'Getaway Driver',
    blurb: 'Her associate is hot. Pick him up and lose the cops on the way home.',
    reward: 650,
    wanted: 2,
    steps: [
      { type: 'pickup', place: 'downtown', text: 'Pick up Rook in Downtown' },
      { type: 'escape', place: 'hideout', text: 'Reach the hideout in Solmar Heights' },
    ],
  },
  {
    id: 'grand-theft',
    title: 'Grand Theft Solmar',
    blurb: 'A gold Vantara GT is parked on Casino Row. Bring it to the garage. Quietly.',
    reward: 900,
    wanted: 1,
    steps: [
      { type: 'steal', place: 'casino', text: 'Steal the gold Vantara GT on Casino Row' },
      { type: 'deliver', place: 'garage', text: 'Deliver it to the garage in Old Port' },
    ],
  },
  {
    id: 'marina-heist',
    title: 'The Marina Heist',
    blurb: 'One last job: grab the shipment at the docks and vanish before the sirens close in.',
    reward: 1500,
    wanted: 3,
    timeLimit: 150,
    steps: [
      { type: 'pickup', place: 'docks', text: 'Grab the shipment at the docks' },
      { type: 'escape', place: 'hideout', text: 'Escape to the hideout — do not get busted' },
    ],
  },
];
