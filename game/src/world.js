// The game's rules and state, with no drawing and no browser in it: the thief, the
// patrolling guards and their vision cones, line of sight past walls and crates,
// the detection meter, relics, the exit, lives and score. step() advances one fixed
// step and returns what happened as bit flags, so the caller can react without the
// world knowing about screens or sound. Nothing here allocates after createWorld.
import { DETECT, FIELD, GHOST_BONUS, GUARD, LEVEL_CLEAR_POINTS, LIVES, PLAYER, RELIC_POINTS } from './config.js';
import { LEVELS, TOTAL_RELICS } from './levels.js';

export const EVENT_RELIC = 1;
export const EVENT_ALARM = 2;
export const EVENT_CAUGHT = 4;
export const EVENT_CLEAR = 8;
export const EVENT_WIN = 16;
export const EVENT_OVER = 32;

function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** True when the segment (x1,y1)-(x2,y2) touches the rectangle. */
function segmentHitsRect(x1, y1, x2, y2, rect) {
  const minX = rect.x;
  const maxX = rect.x + rect.w;
  const minY = rect.y;
  const maxY = rect.y + rect.h;
  if (x1 >= minX && x1 <= maxX && y1 >= minY && y1 <= maxY) return true;
  if (x2 >= minX && x2 <= maxX && y2 >= minY && y2 <= maxY) return true;
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tmin = 0;
  let tmax = 1;
  if (dx === 0) {
    if (x1 < minX || x1 > maxX) return false;
  } else {
    let t1 = (minX - x1) / dx;
    let t2 = (maxX - x1) / dx;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  if (dy === 0) {
    if (y1 < minY || y1 > maxY) return false;
  } else {
    let t1 = (minY - y1) / dy;
    let t2 = (maxY - y1) / dy;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  return true;
}

/** Push a circle out of every solid rectangle it overlaps. */
function resolveCircle(state, circle) {
  for (const rect of state.solids) {
    const cx = clamp(circle.x, rect.x, rect.x + rect.w);
    const cy = clamp(circle.y, rect.y, rect.y + rect.h);
    const dx = circle.x - cx;
    const dy = circle.y - cy;
    const d2 = dx * dx + dy * dy;
    const r = circle.radius;
    if (d2 >= r * r) continue;
    if (d2 === 0) {
      // Centre inside the rectangle: push out along the smallest penetration.
      const left = circle.x - rect.x;
      const right = rect.x + rect.w - circle.x;
      const top = circle.y - rect.y;
      const bottom = rect.y + rect.h - circle.y;
      const m = Math.min(left, right, top, bottom);
      if (m === left) circle.x = rect.x - r;
      else if (m === right) circle.x = rect.x + rect.w + r;
      else if (m === top) circle.y = rect.y - r;
      else circle.y = rect.y + rect.h + r;
      continue;
    }
    const d = Math.sqrt(d2);
    circle.x = cx + (dx / d) * r;
    circle.y = cy + (dy / d) * r;
  }
  circle.x = clamp(circle.x, circle.radius, FIELD.width - circle.radius);
  circle.y = clamp(circle.y, circle.radius, FIELD.height - circle.radius);
}

export function createWorld() {
  const player = { x: 0, y: 0, radius: PLAYER.radius };
  const guards = [];
  for (let index = 0; index < 3; index += 1) {
    guards.push({
      x: 0, y: 0, radius: GUARD.radius, angle: 0,
      wpIndex: 0, pauseTimer: 0, mode: 'patrol', chaseTimer: 0, seenTimer: 0,
    });
  }
  const state = {
    player, guards,
    levelIndex: 0, levelName: LEVELS[0].name,
    solids: [], shadows: [], relics: [], relicTaken: [],
    exit: { x: 0, y: 0 }, exitOpen: false,
    meter: 0, lives: LIVES, score: 0,
    relicsGot: 0, relicsTotal: TOTAL_RELICS,
    levelTime: 0, totalTime: 0, alarmed: false, won: false, over: false, levelTaken: 0,
  };

  function loadLevel(index, caught) {
    // Caught mid-level: the relics pocketed on this floor are lost with the reload.
    if (caught) state.relicsGot -= state.levelTaken;
    state.levelTaken = 0;
    const level = LEVELS[index];
    state.levelIndex = index;
    state.levelName = level.name;
    state.solids = level.walls.concat(level.crates);
    state.shadows = level.shadows;
    state.relics = level.relics.map(([x, y]) => ({ x, y }));
    state.relicTaken = level.relics.map(() => false);
    state.exit = { x: level.exit[0], y: level.exit[1] };
    state.exitOpen = false;
    state.levelTime = 0;
    state.meter = 0;
    player.x = level.playerStart[0];
    player.y = level.playerStart[1];
    for (let index2 = 0; index2 < guards.length; index2 += 1) {
      const guard = guards[index2];
      const spec = level.guards[index2];
      const start = spec.waypoints[0];
      guard.x = start[0];
      guard.y = start[1];
      guard.wpIndex = 1 % spec.waypoints.length;
      guard.pauseTimer = 0;
      guard.mode = 'patrol';
      guard.chaseTimer = 0;
      guard.seenTimer = 0;
      const next = spec.waypoints[guard.wpIndex];
      guard.angle = Math.atan2(next[1] - start[1], next[0] - start[0]);
    }
  }

  function reset() {
    state.lives = LIVES;
    state.score = 0;
    state.relicsGot = 0;
    state.totalTime = 0;
    state.alarmed = false;
    state.won = false;
    state.over = false;
    loadLevel(0);
  }

  function level() {
    return LEVELS[state.levelIndex];
  }

  function inShadow(x, y) {
    for (const zone of state.shadows) {
      if (x >= zone.x && x <= zone.x + zone.w && y >= zone.y && y <= zone.y + zone.h) return true;
    }
    return false;
  }

  function hasLineOfSight(gx, gy, px, py) {
    for (const rect of state.solids) {
      if (segmentHitsRect(gx, gy, px, py, rect)) return false;
    }
    return true;
  }

  function guardSees(guard, li) {
    const dx = player.x - guard.x;
    const dy = player.y - guard.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const sight = GUARD.sight[li];
    if (dist > sight) return 0;
    const want = Math.atan2(dy, dx);
    if (Math.abs(angleDiff(want, guard.angle)) > GUARD.halfAngle) return 0;
    if (!hasLineOfSight(guard.x, guard.y, player.x, player.y)) return 0;
    // Closer means spotted faster: full rate inside the close band, fading to a
    // quarter at the cone's edge.
    const closeness = dist < sight * DETECT.closeRange ? 1 : 1 - 0.75 * ((dist - sight * DETECT.closeRange) / (sight * (1 - DETECT.closeRange)));
    return closeness;
  }

  function stepGuard(guard, dt, li, input) {
    const spec = level().guards[guards.indexOf(guard)];
    const speed = GUARD.patrol[li];
    if (guard.mode === 'chase') {
      const dx = player.x - guard.x;
      const dy = player.y - guard.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 1) {
        guard.x += (dx / dist) * GUARD.chase * dt;
        guard.y += (dy / dist) * GUARD.chase * dt;
        guard.angle = Math.atan2(dy, dx);
      }
      resolveCircle(state, guard);
      return;
    }
    if (guard.pauseTimer > 0) {
      guard.pauseTimer -= dt;
      return;
    }
    const target = spec.waypoints[guard.wpIndex];
    const dx = target[0] - guard.x;
    const dy = target[1] - guard.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const stepLen = speed * dt;
    if (dist <= stepLen) {
      guard.x = target[0];
      guard.y = target[1];
      guard.wpIndex = (guard.wpIndex + 1) % spec.waypoints.length;
      guard.pauseTimer = GUARD.pause;
      return;
    }
    guard.x += (dx / dist) * stepLen;
    guard.y += (dy / dist) * stepLen;
    guard.angle = Math.atan2(dy, dx);
  }

  /**
   * One fixed step. `input` is {dx, dy, sprint, sneak}; with `harmless` set (the
   * title screen's backdrop) guards patrol but nothing is seen, taken or scored.
   */
  function step(dt, input, harmless) {
    if (state.over || state.won) return 0;
    let events = 0;
    state.levelTime += dt;
    state.totalTime += dt;
    const li = state.levelIndex;

    // Move the thief.
    if (!harmless) {
      const len = Math.sqrt(input.dx * input.dx + input.dy * input.dy);
      const speed = input.sprint ? PLAYER.sprint : input.sneak ? PLAYER.sneak : PLAYER.walk;
      if (len > 0) {
        player.x += (input.dx / len) * speed * dt;
        player.y += (input.dy / len) * speed * dt;
        resolveCircle(state, player);
      }
    }

    // Guards patrol, see, chase.
    let seen = 0;
    let heard = false;
    for (const guard of guards) {
      stepGuard(guard, dt, li, input);
      if (harmless) continue;
      const spot = guardSees(guard, li);
      if (spot > 0) {
        seen = Math.max(seen, spot);
        guard.seenTimer = GUARD.chaseMemory;
      } else if (guard.seenTimer > 0) {
        guard.seenTimer -= dt;
      }
      if (!harmless && input.sprint && (input.dx !== 0 || input.dy !== 0)) {
        const dx = player.x - guard.x;
        const dy = player.y - guard.y;
        if (dx * dx + dy * dy < PLAYER.noiseRadius * PLAYER.noiseRadius) {
          heard = true;
          guard.angle += angleDiff(Math.atan2(dy, dx), guard.angle) * Math.min(1, 3 * dt);
        }
      }
      if (guard.mode === 'chase') {
        if (guard.seenTimer <= 0) {
          guard.chaseTimer -= dt;
          if (guard.chaseTimer <= 0) guard.mode = 'patrol';
        } else {
          guard.chaseTimer = GUARD.chaseMemory;
        }
      }
    }

    // The detection meter.
    if (!harmless) {
      if (seen > 0) {
        let rate = DETECT.fill * seen;
        if (input.sneak) rate *= DETECT.fillSneak;
        if (inShadow(player.x, player.y)) rate *= DETECT.fillShadow;
        if (input.sprint) rate *= 2;
        state.meter = Math.min(1, state.meter + rate * dt);
      } else if (heard) {
        state.meter = Math.min(1, state.meter + DETECT.fillHeard * dt);
      } else {
        state.meter = Math.max(0, state.meter - DETECT.decay * dt);
      }
      if (state.meter >= 1) {
        state.alarmed = true;
        events |= EVENT_ALARM;
        for (const guard of guards) {
          if (guardSees(guard, li) > 0 || guard.seenTimer > 0) {
            guard.mode = 'chase';
            guard.chaseTimer = GUARD.chaseMemory;
          }
        }
        state.meter = 0.6;
      }
    }

    // Caught: a chasing guard reaches the thief.
    if (!harmless) {
      for (const guard of guards) {
        if (guard.mode !== 'chase') continue;
        const dx = player.x - guard.x;
        const dy = player.y - guard.y;
        if (dx * dx + dy * dy < 26 * 26) {
          state.lives -= 1;
          events |= EVENT_CAUGHT;
          state.meter = 0;
          if (state.lives <= 0) {
            state.over = true;
            events |= EVENT_OVER;
          } else {
            loadLevel(state.levelIndex, true);
          }
          return events;
        }
      }
    }

    // Relics.
    if (!harmless) {
      for (let index = 0; index < state.relics.length; index += 1) {
        if (state.relicTaken[index]) continue;
        const relic = state.relics[index];
        const dx = player.x - relic.x;
        const dy = player.y - relic.y;
        if (dx * dx + dy * dy < 30 * 30) {
          state.relicTaken[index] = true;
          state.levelTaken += 1;
          state.relicsGot += 1;
          state.score += RELIC_POINTS;
          events |= EVENT_RELIC;
        }
      }
      const taken = state.relicTaken.filter(Boolean).length;
      if (taken === state.relics.length) state.exitOpen = true;
    }

    // The exit.
    if (!harmless && state.exitOpen) {
      const dx = player.x - state.exit.x;
      const dy = player.y - state.exit.y;
      if (dx * dx + dy * dy < 34 * 34) {
        const timeBonus = Math.max(0, 240 - Math.floor(state.levelTime));
        state.score += LEVEL_CLEAR_POINTS + timeBonus;
        events |= EVENT_CLEAR;
        if (state.levelIndex + 1 >= LEVELS.length) {
          state.won = true;
          if (!state.alarmed) state.score += GHOST_BONUS;
          events |= EVENT_WIN;
        } else {
          loadLevel(state.levelIndex + 1);
        }
      }
    }
    return events;
  }

  reset();
  return { state, reset, step, loadLevel };
}
