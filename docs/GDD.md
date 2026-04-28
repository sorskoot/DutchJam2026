# SpeedRoads: Highway Panic - Game Design Document

## SpeedRoads: Highway Panic

*A fast-paced 3D survival driving game where slowing down means exploding.*

1. High-Concept Summary
   You drive a city bus rigged with a bomb. If your speed drops below 50 mph, a countdown starts. Stay above 50 by
   weaving through traffic, avoiding lane closures, hitting ramps, and navigating a chaotic 5-lane highway.

   **Theme**
   Don’t stop moving.

   **Tone**
   High-pressure, cinematic, slightly humorous.

   **Camera**
   Third-person chase cam. First version is locked behind the bus, if time allows it we can make the camera more
   dynamic (e.g. slight tilt when turning, zoom out at high speed) and elastic.

2. Core Gameplay Loop
    1. Maintain speed above 50 mph
    2. Navigate traffic and obstacles
    3. Use ramps/boosts to recover speed
    4. Survive as long as possible
    5. Score increases with distance traveled

       **Fail state**: Speed < 50 mph for 2 seconds → explosion → game over.

________________________________________

## Core Mechanics

**Speed Bomb System**

- Speedometer constantly visible
- Threshold: 50 mph
- If speed < 50 → warning siren, screen flashes red, 2-second countdown
- If speed recovers → countdown resets
- If countdown hits zero → explosion

**Bus Handling**

- Heavy, slow steering
- Gradual lane changes (no instant strafing)
- Acceleration is limited
- Braking is disabled (bomb logic)

**Obstacles**

- Slow cars in lanes
- Trucks blocking lanes
- Lane closures with cones/barriers
- Construction pits (gaps)
- Road splits (choose left or right)
- Debris that slows you down
- Oil slicks (reduced steering)

**Movement Aids**

- Boost pads
- Downhill slopes
- Ramps over broken sections
- Drafting behind cars (optional)

________________________________________

## Level Design

**Highway Structure**

- 5 lanes
- Repeating modular segments (50-100m each)
  - Maybe start random. Later we can add some scripted segments for variety.
- Each segment contains 0-3 obstacles
- Occasional splits into 3-4 lanes
- Rare “bridge collapse” gaps requiring a ramp
- Progressively more difficult segments as you go further

**Segment Types**

- Traffic segment: cars in lanes
- Construction segment: closures, cones
- Gap segment: ramps + missing road
- Boost segment: speed pads
- Chaos segment: mixed hazards

**Difficulty Curve**

- Starts with light traffic
- Gradually increases density
- More closures and gaps appear
- Speed threshold may increase slightly (optional)
- Bus inside tunnel, camera outside above so bus is not visible for a moment. 

________________________________________

## Art Direction

### Style

- Simple, readable 3D
- Low-poly or mid-poly
- Bright colors for obstacles
- Realistic but stylized highway environment
- Emphasis on clarity over detail

### Key Visual Elements

- Yellow/blue bus
- Orange cones
- Red/white barriers
- Asphalt with lane markings
- Simple car models
- Boost pads glowing blue
- Ramps made from construction planks or tilted trucks

________________________________________

## Audio Direction

- Engine hum that changes with speed
- Warning siren when under 50
- Honking cars
- Construction zone ambience
- Explosion SFX on fail
- Upbeat, tense music track

________________________________________

## Game Feel / Juice

- Camera shake on collisions
- Sparks when scraping cars
- Motion blur at high speed
- Screen vignette when under 50
- Speed lines when boosting
- Explosion with fireball + debris

________________________________________

## Technical Breakdown (Babylon.js-friendly)

**Scene Setup**

- Ground: long highway mesh or repeated segments
- Lanes: 5, each 3-4 meters wide
- Player bus: physics impostor or simple kinematic movement
- Traffic cars: simple AI moving forward at slower speeds
- Obstacles: static meshes with collision boxes

**Systems**

- Speed system
- Countdown system
- Segment spawner
- Traffic spawner
- Collision slowdown
- Boost pad logic
- Ramp physics (simple upward impulse)

**Performance**

- Recycle segments behind the player
- Recycle traffic cars
- Keep draw calls low (instancing)

________________________________________

## Production Plan

### Phase 1

Create the very basic version of the game. Player is a yellow box. Highway is simple. Movement is forward + left/right
or break.

### TODO

-[x] Set up project
    - [x] Create Main scene
    - [x] Set up basic camera
    - [x] Create player bus placeholder
    - [x] Add controls.
    - [x] Create first basic game loop
-[x] Add to GitHub 
-[ ] Set up highway
-[x] Add bus model or placeholder box
-[ ] Implement forward movement + steering
-[ ] Add speedometer UI
-[ ] Implement speed bomb logic
-[ ] Add warning UI + countdown
-[ ] Add explosion fail state
-[ ] Add traffic cars
-[ ] Add lane closures
-[ ] Add simple collision slowdown
-[ ] Add ramps + gaps
-[ ] Add boost pads
-[ ] Add segment spawning
-[ ] Add juice: camera shake, sparks, warning flash
-[ ] Add basic sound effects
-[ ] Polish
-[ ] Balance difficulty
-[ ] Add title screen + restart button
-[ ] Set up Itch.io page

________________________________________

## Win/Lose Conditions

### Win

Technically you can't win. Survive as long as possible (distance score).

### Lose

Speed < 50 mph for 2 seconds → explosion.
