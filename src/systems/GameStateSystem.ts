import {AdvancedDynamicTexture, Control} from '@babylonjs/gui';
import type {GameScene} from '@sorskoot/babylon-kit';
import type {PlayerObject} from '../entities/PlayerObject.ts';
import {gameSystems, SystemBase} from './SystemBase.ts';
import type {TileScrollingSystem} from './TileScrollingSystem.ts';

export type GameState = 'playing' | 'dead';

/**
 * Tracks overall game state and shows a game-over overlay when the player falls
 * off the tiles.  MainScene stops calling gameSystems.update() when dead so all
 * other systems freeze automatically.
 */
export class GameStateSystem extends SystemBase {
    public state: GameState = 'playing';
    declare private gameScene: GameScene;
    declare private gameOverGui: AdvancedDynamicTexture;
    declare private gameOverRestartButton: Control;

    constructor(gameScene: GameScene) {
        super();
        this.gameScene = gameScene;
    }

    async register() {
        this.gameOverGui = await AdvancedDynamicTexture.ParseFromFileAsync(
            'assets/gui/guiGameOver.json'
        );
        this.gameOverGui.rootContainer.isVisible = false;
        this.gameOverRestartButton = this.gameOverGui.getControlByName('btnRestart')!;
        this.gameOverRestartButton.onPointerClickObservable.add(this.reset);
    }

    triggerGameOver(): void {
        if (this.state === 'dead') {
            return;
        }
        this.state = 'dead';
        this._showOverlay();
    }

    reset = () => {
        this.state = 'playing';
        this.gameOverGui.rootContainer.isVisible = false;

        const tileSystem = gameSystems.get('tiles') as TileScrollingSystem | undefined;
        tileSystem?.reset();

        const player = this.gameScene.getGameObject('Player') as PlayerObject | undefined;
        player?.reset();
    };

    // ── Internals ────────────────────────────────────────────────────────────

    // GameStateSystem itself has no per-frame work – state is read externally.
    override update(_delta: number): void {}

    private _showOverlay(): void {
        this.gameOverGui.rootContainer.isVisible = true;
    }
}
