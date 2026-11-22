# Moonlit Vault — 9 guards, 12 relics, 1 shadow, 0 alarms

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/Jo3st4r/best-stealth-game-20261121-bot/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/Jo3st4r/best-stealth-game-20261121-bot/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

A top-down stealth game for the [best-stealth-game-20261121-1759](https://make.fun/bounty/best-stealth-game-20261121-1759) bounty on make.fun. You are a thief in a moonlit museum: slip past 9 patrolling guards, pocket 12 relics across 3 floors, and reach the exit unseen. Trip 0 alarms and take the Ghost bonus.

## How to play

- **Move** — WASD or arrow keys.
- **Sprint** — hold Shift. Faster, but loud: guards nearby turn toward the noise, and a sprinting thief fills the detection meter twice as fast inside a cone.
- **Sneak** — hold C. Slower, but the meter fills far slower.
- **Hide** — walls and crates block a guard's eyes. Dark shadow pools on the floor slow detection to a crawl.
- **Win** — grab every relic on a floor and the EXIT unlocks. Clear all 3 floors. Get caught 3 times and the run ends.
- **Pause** — P or Esc. Start / restart — Space or click.

## The floors

1. **The Gallery** — 3 guards, 4 relics. Learn the cones.
2. **The Vault Hall** — 3 faster guards with longer sight, 4 relics.
3. **The Crown Room** — 3 guards at their sharpest, 4 relics, and the crown itself.

Score: 100 per relic, 250 per cleared floor plus a time bonus, 500 Ghost bonus for finishing without ever being spotted.

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network request: `game/` is plain static files (canvas, ES modules, synthesized WebAudio blips) that open in any desktop browser.

## Entry

Built for make.fun competition `best-stealth-game-20261121-1759`. `main.ts` (Node 22) copies `game/` and `screenshots/` to `/output` and writes `dossier.json` with the kit's `vendor/makefun-game.ts`.
