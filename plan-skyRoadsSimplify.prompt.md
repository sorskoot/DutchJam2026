# Plan: Simplify to SkyRoads-style Game

Replace the GLB-based bus/road setup with BabylonJS primitives: a sphere player on 5-lane scrolling floating tiles, with faked gravity, AABB collision, and game-over on falling.

## Decisions

- **5 lanes** at X positions: `[-8, -4, 0, 4, 8]`
- **Gravity**: faked (a `fakeGravity` constant on the player, easy to tweak via powerups later)
- **Collision**: manual AABB (no physics engine)
- **Lane movement**: snap to adjacent lane with a short lerp (~0.1 s) for visual polish
- **Gap guarantee**: TBD – fully random for now, can enforce contiguous path later

---

## Steps

### 1. Create `PlayerObject.ts` (replaces `BusObject.ts`)

File: `src/entities/PlayerObject.ts`

- Create a `MeshBuilder.CreateSphere` as the player mesh (no GLB dependency).
- Store `verticalVelocity: number` and `fakeGravity = -20` (world units / s²).
- Store `isGrounded: boolean`.
- On `jump` action (Space / W / ArrowUp), if `isGrounded`, apply upward impulse (e.g. `verticalVelocity = +10`).
- Each frame: apply `verticalVelocity += fakeGravity * deltaTime`; move player Y by `verticalVelocity * deltaTime`.
- If player Y drops below a kill threshold (e.g. `y < -5`) call `GameStateSystem.triggerGameOver()`.
- Left/right moves one lane per key-press (debounced), lerped over ~0.1 s, clamped to lanes 0–4.

### 2. Create `TileScrollingSystem.ts` (replaces `RoadScrollingSystem.ts`)

File: `src/systems/TileScrollingSystem.ts`

- Lane X positions: `[-8, -4, 0, 4, 8]`.
- Tile size: `4 wide × 0.5 tall × 4 deep` (BabylonJS `MeshBuilder.CreateBox`).
- Maintain a pool of row objects; each row has up to 5 tile meshes.
- Row generation: randomly decide which lanes are filled (keep at least 2–3 tiles per row for playability — enforce later).
- Scroll every tile forward (+Z) each frame by `speed * deltaTime`.
- Recycle rows that pass the camera recycle threshold: move to far end and re-randomise lane pattern.
- Expose `getActiveTiles(): { mesh: Mesh; laneIndex: number; z: number }[]` for AABB queries.

### 3. Add `GameStateSystem.ts`

File: `src/systems/GameStateSystem.ts`

- Holds `state: 'playing' | 'dead'`.
- Exposes `triggerGameOver()`: sets state to `'dead'`, shows a simple overlay/restart prompt (DOM div or `alert`).
- `update()` becomes a no-op when `state === 'dead'`.
- `MainScene.update()` checks `GameStateSystem.state` before calling `gameSystems.update()`.

### 4. AABB Landing Logic (inside `PlayerObject.onUpdate()`)

- Each frame, if `verticalVelocity <= 0` (player moving down or stationary in air):
  - Iterate tiles from `TileScrollingSystem.getActiveTiles()`.
  - For each tile, check AABB overlap on X and Z (player sphere half-width vs tile bounds).
  - Also check that player bottom (Y - radius) is at or just below tile top (tileY + 0.25).
  - On hit: snap `position.y` to tile top + player radius, set `verticalVelocity = 0`, `isGrounded = true`.
- Set `isGrounded = false` at the start of each frame; re-set to `true` only if a landing is detected.

### 5. Rewrite `MainScene.ts`

File: `src/scenes/MainScene.ts`

- Remove all `assetManager.loadModel` / `instantiate` calls (Art, Cars, Road GLBs).
- Remove `BusObject`, `RoadScrollingSystem`, `ObstacleSpawnerSystem` imports and registrations.
- Bind `jump` action to `Key.Space`, re-bind `forward` (W / ArrowUp) to `jump` as well.
- Keep `left` (A / ArrowLeft) and `right` (D / ArrowRight) bindings.
- Create `PlayerObject` (passes `scene` + `game`) and `add` it via `addGameObject`.
- Create `TileScrollingSystem(scene)` and register as `'tiles'`.
- Create `GameStateSystem()` and register as `'gameState'`.
- Register `ScoreSystem` as before.
- Position camera at a fixed offset above/behind the player start position (e.g. `Vector3(0, 8, 10)`) targeting `Vector3(0, 0, -20)` for a good SkyRoads-like view angle.

### 6. Empty / Delete Obsolete Files

- `src/entities/BusObject.ts` → delete or empty.
- `src/entities/CarObject.ts` → delete or empty.
- `src/entities/RoadObject.ts` → delete or empty.
- `src/systems/ObstacleSpawnerSystem.ts` → delete or empty.
- `src/systems/RoadScrollingSystem.ts` → delete or replaced by `TileScrollingSystem.ts`.

---

## Open Questions

1. **Lane-snap feel**: lerp over 0.1 s currently assumed — adjust once playable.
2. **Minimum gap guarantee**: fully random for now; add "ensure at least one contiguous path" logic if random gen feels unfair.
3. **Score**: increment over time (distance) in `ScoreSystem`; display via a DOM overlay.
4. **Speed ramp**: `TileScrollingSystem.speed` starts at e.g. `15` and increases gradually — wire into `SpeedSystem` later.

