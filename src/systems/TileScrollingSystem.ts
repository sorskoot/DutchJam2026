import {Color3, Matrix, Mesh, MeshBuilder, Scene, StandardMaterial} from '@babylonjs/core';
import {rng} from '../utils/rng.ts';
import {SystemBase} from './SystemBase.ts';

/** X center of each of the 5 lanes. */
const LANE_X: readonly number[] = [-8, -4, 0, 4, 8];

const TILE_WIDTH = 4;
const TILE_HEIGHT = 0.5;
const TILE_DEPTH = 6;
const TILE_Y = 0; // tile mesh center Y (top = +0.25)

const NUM_ROWS = 32;
const ROW_SPACING = 6; // tile depth (4) + 2-unit gap
const INITIAL_SPEED = 12; // world units / second
const INITIAL_TILE_CHANCE = 0.65; // initial chance for a tile to appear in a lane
const RECYCLE_THRESHOLD = 8; // recycle a row when its Z exceeds this
const SAFE_ROWS = 6; // first N rows start fully filled

/** Data exposed to PlayerObject for AABB collision. */
export interface TilePoint {
    /** World-space X center of the tile. */
    worldX: number;
    /** World-space Y center of the tile (always {@link TILE_Y}). */
    worldY: number;
    /** World-space Z center of the tile. */
    worldZ: number;
}

/**
 * Internal row state tracking enabled lanes and current world Z.
 * @internal
 */
interface TileRow {
    /** Whether each lane slot is active; index 0-4 maps to LANE_X. */
    enabled: boolean[];
    /** Current world Z of this row's center. */
    z: number;
}

/**
 * Creates and scrolls a pool of flat box tiles arranged in 5 lanes.
 * All tiles share a single GPU-instanced mesh (thin instances) to minimize draw calls.
 * Gaps are generated randomly each time a row is recycled.
 */
export class TileScrollingSystem extends SystemBase {
    /** Scroll speed in world units/s — increase over time for difficulty ramp. */
    public speed: number = INITIAL_SPEED;
    private tileChance = INITIAL_TILE_CHANCE;

    /** Pool of row state objects, one per logical tile row. */
    private readonly rows: TileRow[] = [];
    /** The single shared box mesh rendered via thin instances. */
    private readonly tileMesh: Mesh;
    /** Per-instance RGBA color buffer (r,g,b,a) packed as floats. Length = rows * lanes * 4. */
    private readonly colorBuffer: Float32Array;

    /** Palette of selectable tile colors. Consumers may assign any {@link Color3} values. */
    public palette: Color3[] = [
        new Color3(0.15, 0.45, 0.95), // blue
        new Color3(0.95, 0.45, 0.15), // orange
        new Color3(0.15, 0.95, 0.45), // green
        new Color3(0.95, 0.95, 0.2), // yellowa
    ];

    // -={ Thin-instance helpers }=──────────────────────────────────────────._
    /** Zero matrix — scales a thin instance to nothing, effectively hiding it. */
    private static readonly HIDDEN_MATRIX: Matrix = Matrix.Zero();
    /** Scratch matrix used in hot paths to avoid per-frame allocations. */
    private readonly tmpMatrix: Matrix = Matrix.Identity();

    /**
     * Creates the tile mesh, material, row pool, and registers all thin instances.
     *
     * @param scene - The Babylon.js scene to create tile geometry in.
     */
    constructor(scene: Scene) {
        super();

        // -={ Material }=───────────────────────────────────────────────────._
        const mat = new StandardMaterial('tileMat', scene);
        mat.diffuseColor = new Color3(1, 1, 1);
        // mat.specularColor = new Color3(0.4, 0.6, 1.0);
        // mat.emissiveColor = new Color3(0.05, 0.15, 0.35);

        // -={ Master mesh }=────────────────────────────────────────────────._
        // One box mesh – rendered N times via thin instances (1 draw call).
        this.tileMesh = MeshBuilder.CreateBox(
            'tile',
            {width: TILE_WIDTH, height: TILE_HEIGHT, depth: TILE_DEPTH},
            scene
        );
        this.tileMesh.material = mat;
        this.tileMesh.isPickable = false;
        // Enable per-instance colors on the material. Thin-instance color attribute will be uploaded to the GPU.
        // mat.useVertexColor = true;

        // Allocate the per-instance color buffer and initialize to fully-transparent (hidden) values.
        this.colorBuffer = new Float32Array(NUM_ROWS * LANE_X.length * 4);
        for (let i = 0; i < this.colorBuffer.length; i += 4) {
            this.colorBuffer[i] = 0;
            this.colorBuffer[i + 1] = 0;
            this.colorBuffer[i + 2] = 0;
            this.colorBuffer[i + 3] = 0; // alpha 0 hides the tile when using vertex colors
        }
        // -={ Row initialization }=─────────────────────────────────────────._
        for (let r = 0; r < NUM_ROWS; r++) {
            const rowZ = -(r * ROW_SPACING);
            const enabled = new Array<boolean>(LANE_X.length).fill(true);
            this.rows.push({enabled, z: rowZ});
            this.applyPattern(r, r < SAFE_ROWS);
        }

        // -={ Thin instances }=─────────────────────────────────────────────._
        // Register every (row × lane) slot upfront; matrices updated per frame.
        for (let r = 0; r < NUM_ROWS; r++) {
            const row = this.rows[r];
            for (let lane = 0; lane < LANE_X.length; lane++) {
                const isLastInstance = r === NUM_ROWS - 1 && lane === LANE_X.length - 1;
                if (row.enabled[lane]) {
                    Matrix.TranslationToRef(LANE_X[lane], TILE_Y, row.z, this.tmpMatrix);
                    this.tileMesh.thinInstanceAdd(this.tmpMatrix, isLastInstance);
                    // assign a color for this enabled slot
                    this.writeColorToBuffer(r, lane, this.pickColorForRow(), 1);
                } else {
                    this.tileMesh.thinInstanceAdd(
                        TileScrollingSystem.HIDDEN_MATRIX,
                        isLastInstance
                    );
                    // keep transparent color for hidden instances
                }
            }
        }
        // Upload the initial per-instance color buffer to the GPU. Attribute name 'color' is used by the StandardMaterial
        // when useVertexColor = true. Stride=4 (r,g,b,a).
        // NOTE: BabylonJS exposes thinInstanceSetBuffer(name, array, size) for thin-instance per-attribute uploads.
        // If your Babylon version differs, adapt the attribute name/API accordingly.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this.tileMesh as any).thinInstanceSetBuffer('color', this.colorBuffer, 4);
    }

    // -={ Helpers }=────────────────────────────────────────────────────────._

    /**
     * Returns the flat thin-instance index for a given row/lane pair.
     *
     * @param row - Zero-based row index into {@link rows}.
     * @param lane - Zero-based lane index (0–4).
     * @returns The flat buffer index used by {@link Mesh.thinInstanceSetMatrixAt}.
     */
    private instanceIndex(row: number, lane: number): number {
        return row * LANE_X.length + lane;
    }

    /**
     * Writes the enabled flags for one row.
     * Does NOT push matrices to the GPU — callers must do that via
     * {@link syncRowMatrices} or the bulk update in {@link update}.
     *
     * @param rowIndex - Zero-based index into {@link rows}.
     * @param forceAll - When true every lane is enabled regardless of RNG.
     */
    private applyPattern(rowIndex: number, forceAll: boolean): void {
        const row = this.rows[rowIndex];

        if (forceAll) {
            row.enabled.fill(true);
            // assign colors for newly enabled slots
            for (let lane = 0; lane < row.enabled.length; lane++) {
                this.writeColorToBuffer(rowIndex, lane, this.pickColorForRow(), 1);
            }
            return;
        }

        for (let i = 0; i < row.enabled.length; i++) {
            row.enabled[i] = rng.getUniform() < this.tileChance;
        }

        // Guarantee at least 2 tiles per row
        let count = row.enabled.filter(Boolean).length;
        if (count < 2) {
            const order = [0, 1, 2, 3, 4];
            // Fisher-Yates shuffle using our seeded rng
            for (let i = order.length - 1; i > 0; i--) {
                const j = Math.floor(rng.getUniform() * (i + 1));
                [order[i], order[j]] = [order[j], order[i]];
            }
            for (const idx of order) {
                if (!row.enabled[idx]) {
                    row.enabled[idx] = true;
                    if (++count >= 2) {
                        break;
                    }
                }
            }
        }
        // Ensure color buffer is consistent with enabled flags for this row.
        for (let lane = 0; lane < row.enabled.length; lane++) {
            if (row.enabled[lane]) {
                this.writeColorToBuffer(rowIndex, lane, this.pickColorForRow(), 1);
            } else {
                this.writeColorToBuffer(rowIndex, lane, new Color3(0, 0, 0), 0);
            }
        }
    }

    /**
     * Pushes the current Z and enabled state of one row into the thin-instance
     * matrix buffer.
     *
     * @param rowIndex - Index into {@link rows}.
     * @param refresh - When true the GPU buffer is marked dirty immediately.
     */
    private syncRowMatrices(rowIndex: number, refresh: boolean): void {
        const row = this.rows[rowIndex];
        for (let lane = 0; lane < LANE_X.length; lane++) {
            const isLast = refresh && lane === LANE_X.length - 1;
            if (row.enabled[lane]) {
                Matrix.TranslationToRef(LANE_X[lane], TILE_Y, row.z, this.tmpMatrix);
                this.tileMesh.thinInstanceSetMatrixAt(
                    this.instanceIndex(rowIndex, lane),
                    this.tmpMatrix,
                    isLast
                );
                // ensure visible instances have opaque color; preserve any palette color already written
                // (color values are kept in this.colorBuffer and re-uploaded in bulk below when refresh=true)
            } else {
                this.tileMesh.thinInstanceSetMatrixAt(
                    this.instanceIndex(rowIndex, lane),
                    TileScrollingSystem.HIDDEN_MATRIX,
                    isLast
                );
                // mark hidden instances as transparent in the color buffer
                this.writeColorToBuffer(rowIndex, lane, new Color3(0, 0, 0), 0);
            }
        }
        // When requested, push the color buffer to the GPU once per-frame to avoid many small uploads.
        if (refresh) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (this.tileMesh as any).thinInstanceSetBuffer('color', this.colorBuffer, 4);
        }
    }

    /**
     * Writes a color into the per-instance color buffer for a specific row/lane slot.
     * Does not upload to the GPU immediately — callers should trigger an upload via {@link syncRowMatrices} (refresh=true)
     * or rely on the next frame's bulk upload.
     *
     * @param row - Row index.
     * @param lane - Lane index.
     * @param color - RGB color to write.
     * @param alpha - Alpha channel (0 transparent, 1 opaque).
     */
    private writeColorToBuffer(
        row: number,
        lane: number,
        color: Color3,
        alpha: number
    ): void {
        const base = (this.instanceIndex(row, lane) * 4) | 0;
        this.colorBuffer[base] = color.r;
        this.colorBuffer[base + 1] = color.g;
        this.colorBuffer[base + 2] = color.b;
        this.colorBuffer[base + 3] = alpha;
    }

    /**
     * Picks a color for a given row using the seeded RNG and the current {@link palette}.
     */
    private pickColorForRow(): Color3 {
        return rng.getItem(this.palette)!;
    }

    // -={ SystemBase }=─────────────────────────────────────────────────────._

    /**
     * Advances all tile rows by {@link speed} * deltaTime, recycling any row
     * that scrolls past {@link RECYCLE_THRESHOLD} and assigning a new gap pattern.
     *
     * Two-pass approach: all rows are moved first so that {@link minZ} reflects
     * the true post-movement back position before any recycled row is placed.
     * Computing minZ from pre-movement positions would place recycled rows one
     * `speed * deltaTime` step too far back, creating a growing visual gap.
     *
     * @param deltaTime - Elapsed time in seconds since the last frame.
     */
    override update(deltaTime: number): void {
        // -={ Pass 1: advance all rows }=───────────────────────────────────._
        for (const row of this.rows) {
            row.z += this.speed * deltaTime;
        }

        // Find the true minimum Z only after all rows have moved.
        let minZ = Number.POSITIVE_INFINITY;
        for (const row of this.rows) {
            if (row.z < minZ) {
                minZ = row.z;
            }
        }

        // -={ Pass 2: recycle and sync matrices }=──────────────────────────._
        for (let r = 0; r < this.rows.length; r++) {
            const row = this.rows[r];

            if (row.z > RECYCLE_THRESHOLD) {
                // Push row to the back and generate a new gap pattern
                row.z = minZ - ROW_SPACING;
                minZ = row.z;
                this.applyPattern(r, false);
            }

            // Sync all lane matrices for this row; flush GPU buffer on last row
            this.syncRowMatrices(r, r === this.rows.length - 1);
        }

        //  this.speed += deltaTime * 0.1;
        //  this.tileChance -= deltaTime * 0.1;
    }

    // -={ Public API }=─────────────────────────────────────────────────────._

    /**
     * Resets all rows to their initial positions and restores the starting speed.
     * Call this when restarting the game without reloading the page.
     */
    public reset(): void {
        this.speed = INITIAL_SPEED;

        for (let r = 0; r < this.rows.length; r++) {
            this.rows[r].z = -(r * ROW_SPACING);
            this.applyPattern(r, r < SAFE_ROWS);
            this.syncRowMatrices(r, r === this.rows.length - 1);
        }
    }

    /**
     * Returns the world-space center of every currently visible tile.
     * Used by {@link PlayerObject} for AABB landing checks.
     *
     * @returns Array of {@link TilePoint} objects, one per enabled tile slot.
     */
    public getActiveTiles(): TilePoint[] {
        const result: TilePoint[] = [];
        for (const row of this.rows) {
            for (let lane = 0; lane < LANE_X.length; lane++) {
                if (row.enabled[lane]) {
                    result.push({
                        worldX: LANE_X[lane],
                        worldY: TILE_Y,
                        worldZ: row.z,
                    });
                }
            }
        }
        return result;
    }
}
