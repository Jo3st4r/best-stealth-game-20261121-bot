// Moonlit Vault — every tuning number and colour in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 13,
  walk: 250,
  sprint: 375,
  sneak: 150,
  /** Guards hear a sprinting thief inside this radius and turn toward the noise. */
  noiseRadius: 150,
};

export const GUARD = {
  radius: 14,
  /** Patrol speed per level (index 0, 1, 2). */
  patrol: [70, 85, 100],
  chase: 165,
  /** Vision cone: how far a guard sees, and its half-angle in radians. */
  sight: [215, 240, 260],
  halfAngle: 0.62,
  /** Seconds a guard waits at each waypoint before walking on. */
  pause: 0.9,
  /** Seconds a guard keeps chasing after losing sight before giving up. */
  chaseMemory: 1.2,
};

/** Detection meter 0..1. Fill rates per second (scaled by closeness inside the cone). */
export const DETECT = {
  fill: 1.35,
  fillSneak: 0.4,
  fillShadow: 0.35,
  fillHeard: 0.5,
  decay: 0.55,
  /** Fraction of the cone range inside which the fill rate is at its full value. */
  closeRange: 0.45,
};

export const LIVES = 3;
export const RELIC_POINTS = 100;
export const LEVEL_CLEAR_POINTS = 250;
export const GHOST_BONUS = 500;

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'moonlit-vault.best';

export const PALETTE = {
  backdrop: '#070a12',
  floor: '#141a2b',
  floorAlt: '#171e33',
  shadow: '#0d1322',
  wall: '#3a4666',
  wallTop: '#4d5c85',
  crate: '#5a4632',
  crateTop: '#7a6248',
  player: '#e8e4d8',
  playerCloak: '#2b3a55',
  guard: '#e5534b',
  guardCone: 'rgba(242, 201, 76, 0.20)',
  guardConeAlert: 'rgba(229, 83, 75, 0.30)',
  relic: '#f2c94c',
  relicGlow: 'rgba(242, 201, 76, 0.25)',
  exit: '#4fc3f7',
  exitLocked: '#3a4358',
  panel: '#1b2233',
  text: '#eef1f5',
  muted: '#8b93a3',
  danger: '#e5534b',
  gold: '#f2c94c',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
