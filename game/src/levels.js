// The three hand-built floors of the Moonlit Vault. Walls and crates block movement
// and sight; shadow zones are dark floor where a guard's eyes fill the detection
// meter much slower. Guard waypoints never cross a wall, so a patrol is always legal.

export const LEVELS = [
  {
    name: 'The Gallery',
    walls: [
      { x: 380, y: 110, w: 26, h: 300 },
      { x: 700, y: 300, w: 380, h: 26 },
      { x: 850, y: 470, w: 26, h: 90 },
    ],
    crates: [
      { x: 200, y: 480, w: 64, h: 64 },
      { x: 560, y: 120, w: 64, h: 64 },
      { x: 980, y: 520, w: 64, h: 64 },
      { x: 1120, y: 180, w: 64, h: 64 },
    ],
    shadows: [
      { x: 120, y: 300, w: 180, h: 120 },
      { x: 900, y: 80, w: 200, h: 110 },
    ],
    guards: [
      { waypoints: [[150, 200], [350, 200]] },
      { waypoints: [[620, 140], [620, 520]] },
      { waypoints: [[720, 580], [1160, 580]] },
    ],
    relics: [[210, 620], [620, 90], [1010, 180], [1160, 640]],
    playerStart: [70, 70],
    exit: [1210, 70],
  },
  {
    name: 'The Vault Hall',
    walls: [
      { x: 300, y: 180, w: 26, h: 180 },
      { x: 640, y: 360, w: 26, h: 280 },
      { x: 900, y: 80, w: 26, h: 280 },
      { x: 480, y: 520, w: 200, h: 26 },
    ],
    crates: [
      { x: 150, y: 300, w: 64, h: 64 },
      { x: 760, y: 180, w: 64, h: 64 },
      { x: 1080, y: 420, w: 64, h: 64 },
      { x: 420, y: 640, w: 64, h: 64 },
    ],
    shadows: [
      { x: 80, y: 520, w: 200, h: 120 },
      { x: 1000, y: 100, w: 180, h: 110 },
    ],
    guards: [
      { waypoints: [[140, 140], [520, 140], [520, 420], [140, 420]] },
      { waypoints: [[780, 120], [780, 600]] },
      { waypoints: [[980, 620], [1220, 620], [1220, 300], [980, 300]] },
    ],
    relics: [[200, 120], [560, 640], [1150, 120], [900, 640]],
    playerStart: [70, 650],
    exit: [1210, 650],
  },
  {
    name: 'The Crown Room',
    walls: [
      { x: 420, y: 60, w: 26, h: 220 },
      { x: 420, y: 440, w: 26, h: 220 },
      { x: 830, y: 60, w: 26, h: 220 },
      { x: 830, y: 440, w: 26, h: 220 },
      { x: 940, y: 330, w: 180, h: 26 },
    ],
    crates: [
      { x: 180, y: 180, w: 64, h: 64 },
      { x: 1060, y: 180, w: 64, h: 64 },
      { x: 180, y: 480, w: 64, h: 64 },
      { x: 1060, y: 480, w: 64, h: 64 },
      { x: 600, y: 120, w: 64, h: 64 },
    ],
    shadows: [
      { x: 60, y: 300, w: 160, h: 120 },
      { x: 1060, y: 300, w: 160, h: 120 },
    ],
    guards: [
      { waypoints: [[120, 120], [380, 120], [380, 600], [120, 600]] },
      { waypoints: [[900, 120], [1160, 120], [1160, 600], [900, 600]] },
      { waypoints: [[640, 180], [640, 300]] },
    ],
    relics: [[640, 90], [90, 360], [1190, 360], [640, 640]],
    playerStart: [640, 680],
    exit: [640, 40],
  },
];

export const TOTAL_RELICS = LEVELS.reduce((sum, level) => sum + level.relics.length, 0);
export const TOTAL_GUARDS = LEVELS.reduce((sum, level) => sum + level.guards.length, 0);
