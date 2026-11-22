// The screenshot scenes behind ?shot=start|play|caught|clear. Each one plays the real
// rules forward from a fresh world for a fixed number of steps, steered by a simple
// autopilot, so the frame is what a short game really looks like and the same seed
// always gives the same frame. The autopilot scores eight directions: toward the
// nearest relic (or the exit once it opens), away from any guard cone it would walk
// into, and never through a wall.
import { FIELD, STEP } from './config.js';
import { LEVELS } from './levels.js';
import { EVENT_ALARM, EVENT_CAUGHT, EVENT_CLEAR, EVENT_OVER, EVENT_WIN } from './world.js';
import { SCREEN_CLEAR, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const START_SECONDS = 6;
const PLAY_SECONDS = 40;
const LIMIT_SECONDS = 600;
/** How far ahead, in seconds, the autopilot checks each way it could move. */
const HORIZON = 0.9;
const SAMPLE = 1 / 30;
const DIRS = [
  [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1],
];

/** Rough line-of-sight test the autopilot uses: sample points along the segment. */
function blocked(state, x1, y1, x2, y2) {
  const steps = Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 12);
  for (let index = 1; index < steps; index += 1) {
    const x = x1 + ((x2 - x1) * index) / steps;
    const y = y1 + ((y2 - y1) * index) / steps;
    for (const rect of state.solids) {
      if (x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h) return true;
    }
  }
  return false;
}

/** Would standing at (x, y) be inside a guard's cone with a clear line of sight? */
function inCone(state, x, y) {
  for (const guard of state.guards) {
    const dx = x - guard.x;
    const dy = y - guard.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 260) continue;
    const want = Math.atan2(dy, dx);
    let diff = want - guard.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    if (Math.abs(diff) > 0.62) continue;
    if (!blocked(state, guard.x, guard.y, x, y)) return true;
  }
  return false;
}

export function autopilot(state, reckless) {
  const player = state.player;
  let target = null;
  if (state.exitOpen) {
    target = state.exit;
  } else {
    let bestDist = Infinity;
    for (let index = 0; index < state.relics.length; index += 1) {
      if (state.relicTaken[index]) continue;
      const relic = state.relics[index];
      const dist = Math.hypot(relic.x - player.x, relic.y - player.y);
      if (dist < bestDist) {
        bestDist = dist;
        target = relic;
      }
    }
  }
  if (target === null) return { dx: 0, dy: 0, sprint: false, sneak: true };
  let bestDir = DIRS[0];
  let bestScore = -Infinity;
  for (const [dx, dy] of DIRS) {
    const len = Math.hypot(dx, dy);
    const nx = player.x + (dx / len) * 60;
    const ny = player.y + (dy / len) * 60;
    if (nx < 20 || nx > FIELD.width - 20 || ny < 20 || ny > FIELD.height - 20) continue;
    let score = -Math.hypot(target.x - nx, target.y - ny);
    if (!reckless) {
      if (inCone(state, nx, ny)) score -= 900;
      // A step that walks into a wall is wasted: penalise hard.
      if (blocked(state, player.x, player.y, nx, ny)) score -= 500;
    }
    if (score > bestScore) {
      bestScore = score;
      bestDir = [dx, dy];
    }
  }
  return { dx: bestDir[0], dy: bestDir[1], sprint: false, sneak: !reckless };
}

/**
 * Set `world` to the named scene (start, play, caught or clear; any other name is
 * start) and return the screen to draw over it and the best score to show. The
 * caught scene stages a real capture: the thief stands still inside the first
 * guard's cone until the meter fills, the alarm sounds and the guard closes in.
 */
export function stageShot(name, world) {
  const state = world.state;
  world.reset();
  if (name !== 'play' && name !== 'caught' && name !== 'clear') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) {
      world.step(STEP, { dx: 0, dy: 0, sprint: false, sneak: false }, true);
    }
    return { screen: SCREEN_TITLE, best: 0, extra: {} };
  }
  if (name === 'caught') {
    const guard = state.guards[0];
    state.player.x = guard.x + Math.cos(guard.angle) * 80;
    state.player.y = guard.y + Math.sin(guard.angle) * 80;
    // Stop at the alarm itself: the frame shows the guard giving chase, cone red,
    // meter high — the moment the thief is spotted. (The catch itself reloads the
    // floor instantly, so there is no frame of it to take.)
    let events = 0;
    for (let index = 0; index < 30 / STEP; index += 1) {
      events = world.step(STEP, { dx: 0, dy: 0, sprint: false, sneak: false }, false);
      if (events & (EVENT_ALARM | EVENT_CAUGHT | EVENT_OVER)) break;
    }
    return { screen: state.over ? SCREEN_OVER : SCREEN_PLAY, best: state.score, extra: {} };
  }
  const limit = LIMIT_SECONDS;
  const maxSteps = name === 'play' ? PLAY_SECONDS / STEP : limit / STEP;
  let events = 0;
  let clearedLevel = null;
  for (let index = 0; index < maxSteps; index += 1) {
    const before = state.levelIndex;
    events = world.step(STEP, autopilot(state, false), false);
    if ((events & EVENT_CLEAR) && clearedLevel === null) clearedLevel = before;
    if (name === 'play' && state.relicsGot >= 2) break;
    if (name === 'clear' && (events & (EVENT_CLEAR | EVENT_WIN))) break;
    if (events & EVENT_OVER) break;
  }
  if (name === 'clear') {
    if (state.won) return { screen: SCREEN_WIN, best: state.score, extra: { ghost: !state.alarmed } };
    return { screen: SCREEN_CLEAR, best: state.score, extra: { levelName: clearedLevel === null ? state.levelName : LEVELS[clearedLevel].name } };
  }
  return { screen: SCREEN_PLAY, best: state.score, extra: {} };
}
