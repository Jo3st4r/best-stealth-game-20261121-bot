// Drawing only: the world's state and the current screen in, pixels out. The 1280x720
// playfield is scaled to fit the window and centred, the margin filled with the
// backdrop colour. Flat shapes and canvas text for the HUD and the panels.
import { FIELD, FONT, GHOST_BONUS, GUARD, LIVES, PALETTE } from './config.js';
import { LEVELS } from './levels.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_CLEAR = 'clear';
export const SCREEN_WIN = 'win';
export const SCREEN_OVER = 'over';

/** The panel's width; its height grows with its lines: room for the title, the lines and the prompt. */
const PANEL = { width: 640, top: 134, line: 34, bottom: 70 };
const LIFE_SIZE = 20;
const LIFE_GAP = 8;

function cachedLabel(prefix) {
  let value = -1;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const scoreLabel = cachedLabel('Score ');
  const relicLabel = cachedLabel('Relics ');
  const levelLabel = cachedLabel('');
  const finalLabel = cachedLabel('Score ');
  const bestLabel = cachedLabel('Best ');
  const timeLabel = cachedLabel('');

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align) {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align;
    context.fillText(value, x, y);
  }

  function drawFloor(state) {
    context.fillStyle = PALETTE.floor;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    // Checkerboard tiles, faint, so the floor reads as a museum hall.
    context.fillStyle = PALETTE.floorAlt;
    const tile = 80;
    for (let ty = 0; ty < FIELD.height / tile; ty += 1) {
      for (let tx = 0; tx < FIELD.width / tile; tx += 1) {
        if ((tx + ty) % 2 === 0) context.fillRect(tx * tile, ty * tile, tile, tile);
      }
    }
    // Shadow zones: pools of darkness where the thief is hard to spot.
    for (const zone of state.shadows) {
      context.fillStyle = PALETTE.shadow;
      context.fillRect(zone.x, zone.y, zone.w, zone.h);
      context.strokeStyle = 'rgba(79, 195, 247, 0.25)';
      context.lineWidth = 2;
      context.strokeRect(zone.x + 1, zone.y + 1, zone.w - 2, zone.h - 2);
    }
  }

  function drawSolids(state) {
    const level = LEVELS[state.levelIndex];
    for (const wall of level.walls) {
      context.fillStyle = PALETTE.wall;
      context.fillRect(wall.x, wall.y, wall.w, wall.h);
      context.fillStyle = PALETTE.wallTop;
      context.fillRect(wall.x, wall.y, wall.w, 5);
    }
    for (const crate of level.crates) {
      context.fillStyle = PALETTE.crate;
      context.fillRect(crate.x, crate.y, crate.w, crate.h);
      context.fillStyle = PALETTE.crateTop;
      context.fillRect(crate.x, crate.y, crate.w, 6);
      context.strokeStyle = 'rgba(0, 0, 0, 0.35)';
      context.lineWidth = 2;
      context.strokeRect(crate.x + 3, crate.y + 3, crate.w - 6, crate.h - 6);
    }
  }

  function drawRelics(state) {
    const t = performance.now() / 1000;
    for (let index = 0; index < state.relics.length; index += 1) {
      if (state.relicTaken[index]) continue;
      const relic = state.relics[index];
      const pulse = 10 + Math.sin(t * 3 + index) * 2;
      context.fillStyle = PALETTE.relicGlow;
      context.beginPath();
      context.arc(relic.x, relic.y, pulse + 12, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = PALETTE.relic;
      context.beginPath();
      context.moveTo(relic.x, relic.y - 11);
      context.lineTo(relic.x + 8, relic.y);
      context.lineTo(relic.x, relic.y + 11);
      context.lineTo(relic.x - 8, relic.y);
      context.closePath();
      context.fill();
    }
  }

  function drawExit(state) {
    const exit = state.exit;
    const size = 52;
    context.fillStyle = state.exitOpen ? PALETTE.exit : PALETTE.exitLocked;
    context.fillRect(exit.x - size / 2, exit.y - size / 2, size, size);
    // The label is small and light enough to sit inside the box: the old 22px
    // dark text spilled past the locked box's edges and was unreadable.
    context.fillStyle = state.exitOpen ? PALETTE.backdrop : PALETTE.text;
    context.font = `bold 15px ${FONT}`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(state.exitOpen ? 'EXIT' : 'LOCK', exit.x, exit.y + 1);
    if (state.exitOpen) {
      context.strokeStyle = 'rgba(79, 195, 247, 0.5)';
      context.lineWidth = 3;
      context.strokeRect(exit.x - size / 2 - 6, exit.y - size / 2 - 6, size + 12, size + 12);
    }
  }

  function drawGuards(state) {
    for (const guard of state.guards) {
      const li = state.levelIndex;
      const sight = GUARD.sight[li];
      const alert = guard.mode === 'chase' || state.meter > 0.5;
      // Vision cone.
      context.fillStyle = alert ? PALETTE.guardConeAlert : PALETTE.guardCone;
      context.beginPath();
      context.moveTo(guard.x, guard.y);
      context.arc(guard.x, guard.y, sight, guard.angle - GUARD.halfAngle, guard.angle + GUARD.halfAngle);
      context.closePath();
      context.fill();
      // Body: a red disc with a facing tick.
      context.fillStyle = PALETTE.guard;
      context.beginPath();
      context.arc(guard.x, guard.y, guard.radius, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = '#2b0d0b';
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(guard.x, guard.y);
      context.lineTo(guard.x + Math.cos(guard.angle) * (guard.radius + 7), guard.y + Math.sin(guard.angle) * (guard.radius + 7));
      context.stroke();
      if (guard.mode === 'chase') {
        context.fillStyle = PALETTE.danger;
        context.font = `bold 20px ${FONT}`;
        context.textAlign = 'center';
        context.textBaseline = 'bottom';
        context.fillText('!', guard.x, guard.y - guard.radius - 6);
      }
    }
  }

  function drawPlayer(state) {
    const player = state.player;
    // A hooded thief: a pale face dot inside a dark cloak disc.
    context.fillStyle = PALETTE.playerCloak;
    context.beginPath();
    context.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.player;
    context.beginPath();
    context.arc(player.x, player.y, 6, 0, Math.PI * 2);
    context.fill();
  }

  function drawHud(state) {
    context.textBaseline = 'top';
    text(scoreLabel(state.score), 24, 18, 26, PALETTE.text, 'left');
    text(relicLabel(`${state.relicsGot}/${state.relicsTotal}`), 24, 50, 22, PALETTE.gold, 'left');
    text(levelLabel(state.levelName), FIELD.width / 2, 18, 26, PALETTE.text, 'center');
    const mins = Math.floor(state.totalTime / 60);
    const secs = Math.floor(state.totalTime % 60);
    text(timeLabel(`${mins}:${String(secs).padStart(2, '0')}`), FIELD.width / 2, 50, 22, PALETTE.muted, 'center');
    const firstLife = FIELD.width - 24 - LIVES * (LIFE_SIZE + LIFE_GAP) + LIFE_GAP;
    text('Lives', firstLife - 12, 18, 26, PALETTE.text, 'right');
    for (let life = 0; life < LIVES; life += 1) {
      context.fillStyle = life < state.lives ? PALETTE.player : PALETTE.wall;
      context.fillRect(firstLife + life * (LIFE_SIZE + LIFE_GAP), 22, LIFE_SIZE, LIFE_SIZE);
    }
    // Detection meter: a bar under the top edge that fills amber, then red.
    const barW = 320;
    const barX = (FIELD.width - barW) / 2;
    const barY = 84;
    context.fillStyle = '#00000088';
    context.fillRect(barX - 2, barY - 2, barW + 4, 14);
    context.fillStyle = state.meter > 0.66 ? PALETTE.danger : PALETTE.gold;
    context.fillRect(barX, barY, barW * state.meter, 10);
    text('SPOTTED', barX + barW + 10, barY - 2, 18, PALETTE.muted, 'left');
  }

  function drawField(state) {
    drawFloor(state);
    drawRelics(state);
    drawExit(state);
    drawGuards(state);
    drawPlayer(state);
    drawSolids(state);
  }

  function drawPanel(title, lines, prompt) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = PALETTE.panel;
    context.fillRect(x, y, PANEL.width, height);
    context.strokeStyle = PALETTE.gold;
    context.lineWidth = 2;
    context.strokeRect(x + 1, y + 1, PANEL.width - 2, height - 2);
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 78, 46, PALETTE.text, 'center');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 21, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 38, 23, PALETTE.gold, 'center');
  }

  const TITLE_LINES = [
    'Slip past 9 guards, pocket 12 relics, trip 0 alarms.',
    'WASD or arrows to move. Shift to sprint (loud!). C to sneak.',
    'Hide in shadows. Walls and crates block a guard\'s eyes.',
    'Grab every relic, then reach the EXIT unseen.',
    '',
  ];
  const PAUSED_LINES = ['The guards will wait for you.'];
  const OVER_LINES = ['', ''];

  /** Paint one frame: the field, then the HUD or a panel for the screen the game is on. */
  function draw(state, screen, best, extra) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawField(state);
    if (screen === SCREEN_TITLE) {
      TITLE_LINES[4] = bestLabel(best);
      drawPanel('Moonlit Vault', TITLE_LINES, 'Press Space or click to start');
      return;
    }
    drawHud(state);
    if (screen === SCREEN_PAUSED) drawPanel('Paused', PAUSED_LINES, 'Press P to resume');
    else if (screen === SCREEN_CLEAR) {
      drawPanel('Floor cleared', [`${extra.levelName} — every relic pocketed.`, `Score ${state.score}`], 'Press Space for the next floor');
    } else if (screen === SCREEN_WIN) {
      const lines = [
        `All 12 relics. Score ${state.score}.`,
        extra.ghost ? `Ghost — never once spotted. +${GHOST_BONUS}.` : 'Spotted along the way — no ghost bonus this time.',
        `Best ${best}`,
      ];
      drawPanel('The vault is yours', lines, 'Press Space to play again');
    } else if (screen === SCREEN_OVER) {
      OVER_LINES[0] = finalLabel(state.score);
      OVER_LINES[1] = bestLabel(best);
      drawPanel('Caught!', OVER_LINES, 'Press Space or click to try again');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
