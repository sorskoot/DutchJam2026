import {Matrix} from '@babylonjs/core';
import type {AssetManager, ThinInstanceResult} from '@sorskoot/babylon-kit';
import {SystemBase} from './SystemBase.ts';

/** Length of a single road tile in world units (matches RoadSegment_10m in the GLB). */
const SEGMENT_LENGTH = 10;

/** How many road tiles exist in the pool (must cover the full visible Z range). */
const NUM_SEGMENTS = 20;

/**
 * Z position at which a tile is considered "behind the camera" and gets
 * recycled to the far end of the road.
 */
const RECYCLE_THRESHOLD = 25;

/**
 * Scrolls a pool of road-segment thin-instances along the Z axis to create the
 * illusion that the bus (player) is moving forward.
 *
 * The road asset must already be loaded via `assetManager.loadModel('Road', …)`
 * before this system is constructed.
 */
export class RoadScrollingSystem extends SystemBase {
    /** Current scroll speed in world-units per second. */
    public speed = 50;

    private readonly thinResult: ThinInstanceResult;
    /** Thin-instance index for each tile (returned by addInstance). */
    private readonly instanceIndices: number[] = [];
    /** Current Z world position for each tile. */
    private readonly zPositions: number[] = [];

    constructor(assetManager: AssetManager) {
        super();

        // Grab the thin-instance handle for the road model.
        // The underlying meshes are added to the scene automatically.
        this.thinResult = assetManager.instantiate('Road', undefined, {thinInstance: true});

        // Lay the initial set of tiles from z=0 stretching back along -Z.
        for (let i = 0; i < NUM_SEGMENTS; i++) {
            const z = -(i * SEGMENT_LENGTH);
            this.zPositions.push(z);
            const idx = this.thinResult.addInstance(Matrix.Translation(0, 0, z), false);
            this.instanceIndices.push(idx);
        }

        // Upload the whole buffer to the GPU in one go.
        this.thinResult.refreshBuffers();
        // Expand bounding info to cover all instances so frustum culling never
        // prematurely hides tiles that are technically "outside" the source
        // mesh's original bounding box.
        this.thinResult.refreshBoundingInfo();
    }

    override update(deltaTime: number): void {
        // Pass 1 – advance every tile by the same delta so all positions are
        // up-to-date before any recycling decision is made.
        for (let i = 0; i < NUM_SEGMENTS; i++) {
            this.zPositions[i] += this.speed * deltaTime;
        }

        // Find the rearmost tile AFTER movement so the recycle target is exact.
        let minZ = Number.POSITIVE_INFINITY;
        for (let i = 0; i < NUM_SEGMENTS; i++) {
            if (this.zPositions[i] < minZ) minZ = this.zPositions[i];
        }

        // Pass 2 – recycle tiles that have passed the camera and push matrices.
        for (let i = 0; i < NUM_SEGMENTS; i++) {
            if (this.zPositions[i] > RECYCLE_THRESHOLD) {
                this.zPositions[i] = minZ - SEGMENT_LENGTH;
                // Keep minZ current so a second recycle in the same frame also
                // lines up correctly.
                minZ = this.zPositions[i];
            }

            this.thinResult.setInstanceMatrix(
                this.instanceIndices[i],
                Matrix.Translation(0, 0, this.zPositions[i]),
                false,
            );
        }

        // Push all matrix changes to the GPU in a single call.
        this.thinResult.refreshBuffers();
    }
}

