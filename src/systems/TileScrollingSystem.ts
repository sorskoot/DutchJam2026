import {Color3, Mesh, MeshBuilder, Scene, StandardMaterial, Vector3} from '@babylonjs/core';
import {rng} from '../utils/rng.ts';
import {SystemBase} from './SystemBase.ts';

/** X centre of each of the 5 lanes. */
const LANE_X: readonly number[] = [-8, -4, 0, 4, 8];

const TILE_WIDTH = 4;
const TILE_HEIGHT = 0.5;
const TILE_DEPTH = 6 ;
const TILE_Y = 0; // tile mesh centre Y (top = +0.25)

const NUM_ROWS = 20;
const ROW_SPACING = 6;          // tile depth (4) + 2-unit gap
const INITIAL_SPEED = 12;       // world units / second
const RECYCLE_THRESHOLD = 8;    // recycle a row when its Z exceeds this
const SAFE_ROWS = 3;            // first N rows start fully filled

/** Data exposed to PlayerObject for AABB collision. */
export interface TilePoint {
    worldX: number;
    worldY: number;    // tile centre Y (always TILE_Y)
    worldZ: number;
}

interface TileRow {
    meshes: Mesh[];    // one mesh per lane, index 0-4; may be disabled
    z: number;         // current world Z of this row's centre
}

/**
 * Creates and scrolls a pool of flat box tiles arranged in 5 lanes.
 * Gaps are generated randomly each time a row is recycled.
 */
export class TileScrollingSystem extends SystemBase {
    /** Scroll speed in world units/s — increase over time for difficulty ramp. */
    public speed: number = INITIAL_SPEED;

    private readonly rows: TileRow[] = [];

    constructor(scene: Scene) {
        super();

        // Shared material for all tiles
        const mat = new StandardMaterial('tileMat', scene);
        mat.diffuseColor = new Color3(0.15, 0.45, 0.95);
        mat.specularColor = new Color3(0.4, 0.6, 1.0);
        mat.emissiveColor = new Color3(0.05, 0.15, 0.35);

        for (let r = 0; r < NUM_ROWS; r++) {
            const rowZ = -(r * ROW_SPACING);
            const meshes: Mesh[] = [];

            for (let lane = 0; lane < LANE_X.length; lane++) {
                const mesh = MeshBuilder.CreateBox(`tile_r${r}_l${lane}`, {
                    width: TILE_WIDTH,
                    height: TILE_HEIGHT,
                    depth: TILE_DEPTH,
                }, scene);
                mesh.material = mat;
                mesh.position = new Vector3(LANE_X[lane], TILE_Y, rowZ);
                meshes.push(mesh);
            }

            this.applyPattern(meshes, r < SAFE_ROWS);
            this.rows.push({meshes, z: rowZ});
        }
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    /** Enable/disable individual lane tiles for one row. */
    private applyPattern(meshes: Mesh[], forceAll: boolean): void {
        if (forceAll) {
            for (const m of meshes) m.setEnabled(true);
            return;
        }

        // Each lane: 65 % chance of having a tile
        const enabled = meshes.map(() => rng.getUniform() < 0.65);

        // Guarantee at least 2 tiles per row
        let count = enabled.filter(Boolean).length;
        if (count < 2) {
            const order = [0, 1, 2, 3, 4];
            // Fisher-Yates shuffle using our seeded rng
            for (let i = order.length - 1; i > 0; i--) {
                const j = Math.floor(rng.getUniform() * (i + 1));
                [order[i], order[j]] = [order[j], order[i]];
            }
            for (const idx of order) {
                if (!enabled[idx]) {
                    enabled[idx] = true;
                    if (++count >= 2) break;
                }
            }
        }

        for (let i = 0; i < meshes.length; i++) {
            meshes[i].setEnabled(enabled[i]);
        }
    }

    // ── SystemBase ───────────────────────────────────────────────────────────

    override update(deltaTime: number): void {
        // Current minimum Z used to place recycled rows at the far end
        let minZ = Number.POSITIVE_INFINITY;
        for (const row of this.rows) {
            if (row.z < minZ) minZ = row.z;
        }

        for (const row of this.rows) {
            row.z += this.speed * deltaTime;

            if (row.z > RECYCLE_THRESHOLD) {
                // Push row to the back and generate a new gap pattern
                row.z = minZ - ROW_SPACING;
                minZ = row.z;
                this.applyPattern(row.meshes, false);
            }

            // Sync mesh positions
            for (const mesh of row.meshes) {
                mesh.position.z = row.z;
            }
        }
    }

    // ── Public API ───────────────────────────────────────────────────────────

    /**
     * Returns the world-space centre of every currently visible tile.
     * Used by PlayerObject for AABB landing checks.
     */
    getActiveTiles(): TilePoint[] {
        const result: TilePoint[] = [];
        for (const row of this.rows) {
            for (let lane = 0; lane < row.meshes.length; lane++) {
                if (row.meshes[lane].isEnabled()) {
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

