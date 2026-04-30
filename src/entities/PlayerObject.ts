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
const FAKE_GRAVITY = -20; // world units / s²  (easy to tweak later)
const JUMP_IMPULSE = 10; // upward velocity applied on jump
const KILL_Y = -5; // fall below this → game over
const LANE_LERP_SPEED = 10; // fraction-of-gap applied per second (1/0.1 s)
const TILE_HALF_W = 2; // tile width 4  → half = 2
const TILE_HALF_D = 2; // tile depth 4  → half = 2
const LAND_TOLERANCE = 0.8; // how far below tile top we still snap up

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
     * Per-frame update: gravity, jumping, AABB landing, lane movement, and
     * fall / game-over detection.
     *
     * @param deltaTime - Seconds elapsed since the last frame.
     */
    public onUpdate(deltaTime: number): void {
        // Skip when dead
        const stateSystem = gameSystems.get('gameState') as GameStateSystem | undefined;
        if (stateSystem?.state === 'dead') {
            return;
        }

        const input = this.scene.getInputManager();

        // ── 1. Jump (uses isGrounded from previous frame) ──────────────────
        if (this.isGrounded && input.isActionPressed('jump')) {
            this.verticalVelocity = JUMP_IMPULSE;
            this.isGrounded = false;
        }

        // ── 2. Fake gravity + vertical movement ────────────────────────────
        this.verticalVelocity += this.fakeGravity * deltaTime;
        this.position.y += this.verticalVelocity * deltaTime;

        // ── 3. AABB tile landing (only when moving down or stationary) ─────
        this.isGrounded = false;
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
        if (input.isActionPressed('left') && this.currentLaneIndex > 0) {
            this.currentLaneIndex--;
            this.targetLaneX = LANE_X[this.currentLaneIndex];
        }
        if (input.isActionPressed('right') && this.currentLaneIndex < LANE_X.length - 1) {
            this.currentLaneIndex++;
            this.targetLaneX = LANE_X[this.currentLaneIndex];
        }

        // Lerp X toward target lane (~0.1 s travel time)
        this.lerpX +=
            (this.targetLaneX - this.lerpX) * Math.min(1, LANE_LERP_SPEED * deltaTime);
        this.position.x = this.lerpX;

        // ── 5. Fall / game-over detection ──────────────────────────────────
        if (this.position.y < KILL_Y) {
            stateSystem?.triggerGameOver();
        }
    }
}
