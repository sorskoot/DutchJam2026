import {Color3, MeshBuilder, StandardMaterial, Vector3} from '@babylonjs/core';
import {type Game, GameObject, type GameScene} from '@sorskoot/babylon-kit';
import type {GameStateSystem} from '../systems/GameStateSystem.ts';
import {gameSystems} from '../systems/SystemBase.ts';
import type {TileScrollingSystem} from '../systems/TileScrollingSystem.ts';

/** X center of each lane in world space (5 lanes, 4 units apart). */
export const LANE_X: readonly number[] = [-8, -4, 0, 4, 8];

const PLAYER_RADIUS = 0.5;
const START_LANE = 2; // center lane
const TILE_HALF_HEIGHT = 0.25; // tile height 0.5 → top at +0.25 from center
const START_Y = TILE_HALF_HEIGHT + PLAYER_RADIUS; // 0.75 – resting on initial tile
const FAKE_GRAVITY = -60; // world units / s²  (easy to tweak later)
const JUMP_IMPULSE = 15; // upward velocity applied on jump
const KILL_Y = -2; // fall below this → game over
const LANE_LERP_SPEED = 10; // fraction-of-gap applied per second (1/0.1 s)
const TILE_HALF_W = 2; // tile width 4  → half = 2
const TILE_HALF_D = 3; // tile depth 6  → half = 3
const LAND_TOLERANCE = 0.8; // how far below tile top we still snap up
// When the player first falls below `KILL_Y` we enter a dying state and allow
// the sphere to continue falling until it passes this Y value, ensuring it
// visibly disappears off-screen before the game-over overlay appears.
const OUT_OF_SCREEN_Y = -12;

/**
 * The player-controlled sphere.
 *
 * Moves left and right between the five tile lanes, jumps with faked gravity,
 * and lands on tiles via manual AABB checks.  When the sphere falls below
 * {@link KILL_Y} it triggers a game-over via {@link GameStateSystem}.
 *
 * @example
 * ```ts
 * this.addGameObject('Player', new PlayerObject(this, this.game));
 * ```
 */
export class PlayerObject extends GameObject {
    /**
     * Downward acceleration applied every frame (world units / s²).
     * Exposed so power-ups or speed-ramp systems can tweak it at runtime.
     */
    public fakeGravity: number = FAKE_GRAVITY;

    private verticalVelocity: number = 0;
    private isGrounded: boolean = false;
    /** Set when the player has missed tiles and is falling to death. */
    private isDying: boolean = false;

    private currentLaneIndex: number = START_LANE;
    private targetLaneX: number = LANE_X[START_LANE];
    /** Smoothly interpolated X value written to the node each frame. */
    private lerpX: number = LANE_X[START_LANE];

    /**
     * @param scene - The {@link GameScene} this object belongs to.
     * @param game  - The root {@link Game} instance.
     */
    constructor(scene: GameScene, game: Game) {
        super('Player', game, scene);

        const mesh = MeshBuilder.CreateSphere(
            'playerSphere',
            {diameter: 1},
            scene.getScene()
        );
        const mat = new StandardMaterial('playerMat', scene.getScene());
        mat.diffuseColor = new Color3(1, 0.85, 0.1); // warm yellow
        mat.emissiveColor = new Color3(0.4, 0.3, 0); // subtle self-glow
        mesh.material = mat;
        this.node = mesh;
    }

    /** Places the sphere on the center tile of the starting row. */
    public onStart(): void {
        this.position = new Vector3(LANE_X[START_LANE], START_Y, 0);
    }

    /**
     * Resets all physics and lane state back to the initial values.
     * Call this when restarting the game without reloading the page.
     */
    public reset(): void {
        this.currentLaneIndex = START_LANE;
        this.targetLaneX = LANE_X[START_LANE];
        this.lerpX = LANE_X[START_LANE];
        this.verticalVelocity = 0;
        this.isGrounded = false;
        this.isDying = false;
        this.position = new Vector3(LANE_X[START_LANE], START_Y, 0);
    }

    /**
     * Per-frame update: gravity, jumping, AABB landing, lane movement, and
     * fall / game-over detection.
     *
     * @param deltaTime - Seconds elapsed since the last frame.
     */
    public onUpdate(deltaTime: number): void {
        // Skip when dead
        const stateSystem = gameSystems.get('gameState') as GameStateSystem | undefined;
        if (stateSystem?.state !== 'playing') {
            return;
        }

        // If the player already missed the tiles, enter a "dying" free-fall
        // mode: keep applying gravity and don't allow further input/landing
        // checks. Trigger game over only after the sphere falls sufficiently
        // far off-screen.
        if (this.isDying) {
            // Continue accumulating gravity and vertical movement.
            this.verticalVelocity += this.fakeGravity * deltaTime;
            this.position.y += this.verticalVelocity * deltaTime;

            if (this.position.y < OUT_OF_SCREEN_Y) {
                stateSystem?.triggerGameOver();
            }

            return;
        }

        const input = this.scene.getInputManager();

        // Snapshot grounded state from last frame then clear it; will be
        // re-set below if the AABB check finds a tile this frame.
        const wasGrounded = this.isGrounded;
        this.isGrounded = false;

        // ── 1. Jump / gravity ──────────────────────────────────────────────
        if (wasGrounded && input.isActionPressed('jump')) {
            // Launch upward; gravity starts accumulating next frame.
            this.verticalVelocity = JUMP_IMPULSE;
        } else if (!wasGrounded) {
            // Accumulate gravity only while airborne — skipping it when
            // grounded prevents the per-frame dip-then-snap artefact.
            this.verticalVelocity += this.fakeGravity * deltaTime;
        } else {
            this.verticalVelocity = 0;
        }

        // ── 2. Fake gravity + vertical movement ────────────────────────────
        this.position.y += this.verticalVelocity * deltaTime;

        // ── 3. AABB tile landing (only when moving down or stationary) ─────
        const tileSystem = gameSystems.get('tiles') as TileScrollingSystem | undefined;
        if (tileSystem && this.verticalVelocity <= 0) {
            for (const tile of tileSystem.getActiveTiles()) {
                const dx = Math.abs(this.position.x - tile.worldX);
                const dz = Math.abs(this.position.z - tile.worldZ);
                if (dx < TILE_HALF_W + PLAYER_RADIUS && dz < TILE_HALF_D + PLAYER_RADIUS) {
                    const playerBottom = this.position.y - PLAYER_RADIUS;
                    const tileTop = tile.worldY + TILE_HALF_HEIGHT;
                    if (
                        playerBottom <= tileTop &&
                        playerBottom >= tileTop - LAND_TOLERANCE
                    ) {
                        this.position.y = tileTop + PLAYER_RADIUS;
                        this.verticalVelocity = 0;
                        this.isGrounded = true;
                        break;
                    }
                }
            }
        }

        // ── 4. Lane movement (one lane per key-press) ──────────────────────
        if (input.isActionPressed('left') && this.currentLaneIndex < LANE_X.length - 1) {
            // code looks like it's reverted, but it's not.
            this.currentLaneIndex++;
            this.targetLaneX = LANE_X[this.currentLaneIndex];
        }
        if (input.isActionPressed('right') && this.currentLaneIndex > 0) {
            // code looks like it's reverted, but it's not.
            this.currentLaneIndex--;
            this.targetLaneX = LANE_X[this.currentLaneIndex];
        }

        // Lerp X toward target lane (~0.1 s travel time)
        this.lerpX +=
            (this.targetLaneX - this.lerpX) * Math.min(1, LANE_LERP_SPEED * deltaTime);
        this.position.x = this.lerpX;

        // ── 5. Fall / game-over detection ──────────────────────────────────
        if (this.position.y < KILL_Y) {
            // Start the dying fall instead of immediately ending the game so
            // the player visibly falls out of the viewport first.
            this.isDying = true;
            // Ensure we are considered airborne and allow gravity to take over
            // from here on.
            this.isGrounded = false;
            // Reset any upward velocity so the fall is consistent.
            this.verticalVelocity = Math.min(this.verticalVelocity, 0);
        }
    }
}
