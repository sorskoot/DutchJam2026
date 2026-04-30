# AGENTS.md — DutchJam2026 (SpeedRoads: Highway Panic)

## Project Overview

A browser-based 3D endless-runner/survival game built with **Babylon.js** via the `@sorskoot/babylon-kit` engine layer (local `.tgz` peer dep). The player (currently a yellow sphere) hops across scrolling tiles on a 5-lane highway and must avoid falling off. See `docs/GDD.md` for full game design intent.

## Developer Workflows

```powershell
npm run dev        # Vite dev server → http://localhost:4623
npm run build      # tsc type-check + Vite production build
npm run assets     # AssetPack pipeline (raw-assets/ → public/assets/)
npm run assets:watch  # Watch mode for assets
```

No test runner is configured. TypeScript errors (`tsc --noEmit`) are the primary compile-time check.

## Architecture

### Entry point & engine bootstrap (`src/main.ts`)
```
Game('gameCanvas')
  └─ sceneManager.addScene('main', new MainScene(game))
  └─ sceneManager.switchTo('main')
  └─ game.start()
```
`Game` is the single entry point from `@sorskoot/babylon-kit`; never instantiate managers directly.

### Layer structure

| Layer | Where | Role |
|-------|-------|------|
| Engine (`@sorskoot/babylon-kit`) | npm dep | `Game`, `GameScene`, `GameObject`, input, XR, asset pipeline |
| Scenes | `src/scenes/` | Extend `GameScene`; implement `async setup()` + override `update(dt)` |
| Entities | `src/entities/` | Extend `GameObject`; implement `onStart()` + `onUpdate(dt)` |
| Systems | `src/systems/` | Extend `SystemBase`; registered in `gameSystems` singleton; ticked by `MainScene.update()` |
| Utils | `src/utils/` | Standalone helpers (`rng.ts`, `Mathf.ts`) |

### `gameSystems` singleton (`src/systems/SystemBase.ts`)
Systems are registered by name in `MainScene.setup()` before any entity that needs them. Cross-system reads use a cast:
```ts
const state = gameSystems.get('gameState') as GameStateSystem | undefined;
```
`MainScene.update()` stops calling `gameSystems.update()` when `state === 'dead'`, which freezes all systems for free.

### Tile scrolling & collision (`src/systems/TileScrollingSystem.ts`)
- Pool of **20 rows × 5 lanes** of `Box` meshes, recycled when `row.z > RECYCLE_THRESHOLD`.
- First 3 rows (`SAFE_ROWS`) are always fully enabled; later rows have 65 % per-lane tile probability with a minimum of 2 tiles per row.
- `getActiveTiles()` returns `TilePoint[]`; `PlayerObject` iterates these every frame for manual AABB landing checks.
- Speed ramp: write to `tileSystem.speed` to accelerate difficulty.

### Player physics (`src/entities/PlayerObject.ts`)
- 5 lanes at `LANE_X = [-8, -4, 0, 4, 8]`. Lane changes update `currentLaneIndex`; X is lerped via `LANE_LERP_SPEED = 10`.
- Gravity is **fake** (`FAKE_GRAVITY = -20 u/s²`), applied manually each frame.
- Fall-death threshold: `KILL_Y = -5`. Triggers `GameStateSystem.triggerGameOver()`.

### Game-over overlay (`src/systems/GameStateSystem.ts`)
Currently a raw DOM overlay (noted `// TK: Convert to Babylon GUI`). Restart reloads the page (`window.location.reload()`).

## Key Conventions

- **Section headers** in files use: `// -={ Section Name }=──────────────────────────────._`
- **Deprecated stubs** (`BusObject.ts`, `CarObject.ts`, `RoadObject.ts`, `RoadScrollingSystem.ts`) are kept to avoid broken imports but should not be extended.
- `SpeedSystem.ts` / `ScoreSystem.ts` are empty stubs awaiting implementation.
- All local imports use the `.ts` extension (required by `allowImportingTsExtensions: true`).
- `rng` (`src/utils/rng.ts`) is a seeded Alea PRNG singleton exported as `rng`; seed is `Date.now()` on startup. Use it for all procedural generation instead of `Math.random()`.
- `@sorskoot/babylon-kit` is installed from a local `.tgz`; run `npm install` after updating that file.

## Cross-Component Communication

- Entities → Systems: `gameSystems.get('name') as SystemType | undefined`
- Systems → Scene: systems are stateful (`TileScrollingSystem.speed`, `GameStateSystem.state`); scene reads state to gate updates
- No event bus; all coupling is direct `gameSystems` lookups

## What's Next (per GDD TODO)

- `SpeedSystem` — speed bomb / countdown logic
- `ScoreSystem` — distance-based scoring + UI
- Highway segment spawner (replace flat tile grid)
- Traffic cars, lane closures, boost pads, ramps
- Babylon GUI to replace DOM overlay in `GameStateSystem`

