# SpeedRoads: Highway Panic - Game Design Document

## SpeedRoads: Highway Panic

*A fast-paced 3D tile-hopping survival game inspired by the classic SkyRoads.*

1. High-Concept Summary
   The world scrolls forward automatically and the player must jump from tile to tile on a 5-lane highway in the sky.
   Miss a tile, fall off the edge, or get left behind and it is game over. The further you go, the faster and more
   unpredictable the road becomes.

   **Theme**
   Keep moving or fall.

   **Tone**
   Arcade, high-energy, addictive.

   **Camera**
   Third-person chase cam locked slightly above and behind the player. The camera follows the player's lane position
   smoothly. If time allows, add a slight tilt when changing lanes and a slow zoom-out as speed increases.

2. Core Gameplay Loop
    1. The road scrolls forward automatically at increasing speed.
    2. The player jumps between tiles to avoid gaps and stay on the road.
    3. The further the player travels the higher the score.
    4. Survive as long as possible.

       **Fail state**: Player falls off the road (misses a tile or gets left behind) → game over.

________________________________________

## Core Mechanics

**Automatic Scrolling**

- The road always moves toward the player at a fixed forward speed.
- The player cannot stop or slow down the scroll.
- Scroll speed increases gradually over time, raising the difficulty.

**Player Movement**

- Left / right: instant lane change between the 5 lanes (lerped visually for smoothness).
- Jump: the player can jump to cross gaps or avoid hazards.
- No braking, no acceleration — the only inputs are lane change and jump.

**Tiles**

- The playfield is a grid of 5 lanes × N visible rows of tiles.
- Each tile is either present (solid, safe to land on) or absent (a gap).
- The first few rows are always fully present to give the player a safe start.
- Further rows are procedurally generated with increasing gap probability.
- Every row is guaranteed to have at least 2 tiles so the level is always survivable.

**Gaps and Falling**

- If the player lands on a missing tile they fall immediately.
- If the player is still in the air when the row they are above scrolls past the kill plane, they also die.
- Fall death threshold: `Y < -5` units.

________________________________________

## Level Design

**Road Structure**

- 5 lanes, fixed width.
- Endless, procedurally generated rows of tiles recycled from a pool.
- Rows scroll toward the player at the current game speed.

**Tile Generation Rules**

- Rows 0–2 (start / safe zone): all 5 tiles present.
- Rows 3+: each tile has a probability of being present. The probability of a gap increases as distance grows.
- Minimum tiles per row: 2 (to always leave a valid path).
- Special tile types (optional, later phases):
  - **Boost tile**: speeds the scroll up briefly, worth bonus points.
  - **Slow tile**: briefly reduces scroll speed (helpful breathing room).
  - **Crumble tile**: disappears a short time after the player lands on it.

**Difficulty Curve**

- Scroll speed starts slow and ramps up continuously.
- Gap probability increases with distance traveled.
- At high speeds, gap probability plateaus to keep the game technically survivable.
- Possible milestone events at score thresholds (visual change, speed spike, etc.).

________________________________________

## Art Direction

### Style

- Simple, readable 3D.
- Low-poly or mid-poly tiles floating in a stylized sky environment.
- Bright, distinct tile colors for fast readability.
- Emphasis on clarity: the player must instantly see which tiles are present.

### Key Visual Elements

- Solid tiles: bright colored flat boxes (palette shifts with difficulty zone).
- Missing tiles: empty void — no mesh, just the skybox below.
- Player: a small, bright character (currently a yellow sphere placeholder).
- Background: scrolling sky gradient, distant clouds or stars depending on theme.
- Crumble tiles (future): slightly cracked texture with a subtle shake animation.
- Boost tiles (future): glowing blue surface with a particle trail.

________________________________________

## Audio Direction

- Upbeat, looping electronic / chiptune soundtrack.
- Jump sound effect.
- Land sound effect (varies slightly per tile type).
- Fall / death sound effect.
- Speed-up musical cue when the scroll accelerates.
- Short jingle on game over.

________________________________________

## Game Feel / Juice

- Camera bobs slightly on landing.
- Subtle screen shake when falling to death.
- Particle burst on landing.
- Speed lines overlay when scroll speed is very high.
- Tile color palette crossfades between difficulty zones.
- Score counter pulses on each row cleared.

________________________________________

## Technical Breakdown (Babylon.js-friendly)

**Scene Setup**

- Player: simple kinematic sphere/box with fake gravity applied each frame.
- Tile pool: 20 rows × 5 lanes of `Box` meshes, recycled when a row passes the recycle threshold behind the camera.
- Skybox or gradient background.

**Systems**

| System | Description |
|--------|-------------|
| `TileScrollingSystem` | Manages the tile pool, procedural row generation, and scroll speed. |
| `ScoreSystem` | Tracks distance traveled and displays the score. |
| `SpeedSystem` | Controls scroll speed ramp-up over time. |
| `GameStateSystem` | Tracks `playing` / `dead` state, shows game-over overlay, handles restart. |

**Tile Recycling**

- Rows that scroll past `RECYCLE_THRESHOLD` behind the player are repositioned at the far end of the pool with freshly
  generated tile patterns.
- Tile presence uses the `rng` seeded PRNG singleton for reproducible generation during a session.

**Performance**

- All tile meshes are created once and reused (no runtime allocations during play).
- Keep draw calls low via instancing where possible.

________________________________________

## Production Plan

### Phase 1 — Prototype (current)

Basic scrolling tile grid, player sphere that can change lanes and jump, fall detection, game-over screen.

### TODO

- [x] Set up project
    - [x] Create Main scene
    - [x] Set up basic camera
    - [x] Create player placeholder
    - [x] Add controls
    - [x] Create first basic game loop
- [x] Add to GitHub
- [x] Add tile scrolling system (pool of 20 rows × 5 lanes)
- [x] Add lane-change + jump input
- [x] Add fake gravity + fall detection
- [x] Add game-over state
- [x] Add score system (distance traveled)
- [ ] Add speed ramp-up over time
- [x] Add procedural gap generation (increasing difficulty)
- [ ] Add special tile types (boost, crumble)
- [x] Add Babylon GUI to replace DOM game-over overlay
- [ ] Add jump + land particle effects
- [ ] Add camera bob on landing
- [ ] Add speed-lines overlay at high speed
- [ ] Add basic sound effects
- [x] Add title screen + restart button
- [ ] Polish visual palette / skybox
- [ ] Balance difficulty curve
- [ ] Set up Itch.io page

________________________________________

## Win/Lose Conditions

### Win

Technically you cannot win. Survive as long as possible and maximize your distance score.

### Lose

The player falls off the road (lands on a gap or gets left behind by the scroll) → game over.
