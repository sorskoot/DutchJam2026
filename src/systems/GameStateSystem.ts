import {AdvancedDynamicTexture, Control} from '@babylonjs/gui';
import type {GameScene} from '@sorskoot/babylon-kit';

import type {PlayerObject} from '../entities/PlayerObject.ts';
import {gameSystems, SystemBase} from './SystemBase.ts';
import type {TileScrollingSystem} from './TileScrollingSystem.ts';

/** Possible states the game can be in during a session. */
export type GameState = 'playing' | 'dead';

/**
 * Tracks the overall game state and shows a game-over overlay when the player
 * falls off the tiles.
 *
 * {@link MainScene} stops calling `gameSystems.update()` when the state is
 * `'dead'`, which freezes all other systems automatically.
 *
 * @example
 * ```ts
 * const stateSystem = gameSystems.get('gameState') as GameStateSystem | undefined;
 * if (stateSystem?.state === 'dead') { return; }
 * ```
 */
export class GameStateSystem extends SystemBase {
    /** Current game state; read externally by {@link MainScene} and {@link PlayerObject}. */
    public state: GameState = 'playing';

    private gameScene: GameScene;
    private gameOverGui!: AdvancedDynamicTexture;
    private gameOverRestartButton!: Control;

    /**
     * Creates a new {@link GameStateSystem}.
     * @param gameScene - The {@link GameScene} that owns this system.
     */
    constructor(gameScene: GameScene) {
        super();
        this.gameScene = gameScene;
    }

    /**
     * Loads the game-over GUI from disk and wires up the restart button.
     * @returns A promise that resolves when the GUI is ready.
     */
    public override async register(): Promise<void> {
        this.gameOverGui = await AdvancedDynamicTexture.ParseFromFileAsync(
            'assets/gui/guiGameOver.json'
        );
        this.gameOverGui.rootContainer.isVisible = false;
        this.gameOverRestartButton = this.gameOverGui.getControlByName('btnRestart')!;
        this.gameOverRestartButton.onPointerClickObservable.add(this.reset);
    }

    /**
     * Transitions the game to the `'dead'` state and shows the game-over overlay.
     * No-op when the state is already `'dead'`.
     */
    public triggerGameOver(): void {
        if (this.state === 'dead') {
            return;
        }
        this.state = 'dead';
        this.showOverlay();
    }

    /**
     * Resets the game to `'playing'` state, hides the overlay, and restores
     * both the tile system and the player to their starting conditions.
     */
    public reset = (): void => {
        this.state = 'playing';
        this.gameOverGui.rootContainer.isVisible = false;

        const tileSystem = gameSystems.get('tiles') as TileScrollingSystem | undefined;
        tileSystem?.reset();

        const player = this.gameScene.getGameObject('Player') as PlayerObject | undefined;
        player?.reset();
    };

    // -={ Internals }=──────────────────────────────────────────────────────._

    /** GameStateSystem itself has no per-frame work — state is read externally. */
    public override update(_delta: number): void {}

    /** Makes the game-over overlay visible. */
    private showOverlay(): void {
        this.gameOverGui.rootContainer.isVisible = true;
    }
}
