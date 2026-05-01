import {
    Color3,
    Color4,
    FreeCamera,
    HemisphericLight,
    Layer,
    Vector3,
} from '@babylonjs/core';
import {type Game, GameScene, Key} from '@sorskoot/babylon-kit';
import {PlayerObject} from '../entities/PlayerObject.ts';
import {GameStateSystem} from '../systems/GameStateSystem.ts';
import {ScoreSystem} from '../systems/ScoreSystem.ts';
import {gameSystems} from '../systems/SystemBase.ts';
import {TileScrollingSystem} from '../systems/TileScrollingSystem.ts';

/**
 * The main game scene for SpeedRoads: Highway Panic.
 * Bootstraps all systems, lighting, camera, and the player entity.
 * @example
 * ```ts
 * sceneManager.addScene('main', new MainScene(game));
 * sceneManager.switchTo('main');
 * ```
 */
export class MainScene extends GameScene {
    /** Primary free-look camera placed above and behind the player. */
    private camera!: FreeCamera;

    /**
     * Creates a new {@link MainScene}.
     * @param game - The root {@link Game} instance.
     */
    constructor(game: Game) {
        super(game.getEngine(), game);
    }

    /**
     * Initializes the scene: binds input, creates camera & lighting,
     * registers all {@link SystemBase} subsystems, and spawns the player.
     * @returns A promise that resolves when the scene is fully ready.
     */
    async setup(): Promise<void> {
        // -={ Input bindings }=──────────────────────────────────────────────────._
        this.inputManager.bindAction('jump', {keys: [Key.Space, Key.W, Key.ArrowUp]});
        this.inputManager.bindAction('left', {keys: [Key.A, Key.ArrowLeft]});
        this.inputManager.bindAction('right', {keys: [Key.D, Key.ArrowRight]});

        // -={ Camera }=──────────────────────────────────────────────────────────._
        // Positioned above-and-behind the player (z=0), looking forward (-Z).
        this.camera = new FreeCamera('mainCamera', new Vector3(0, 8, 10), this.scene);
        this.camera.setTarget(new Vector3(0, 0, -6));

        const background = new Layer(
            'bg',
            'assets/background/Space002.png',
            this.scene,
            true
        );
        background.color = new Color4(1, 0, 1, 1);

        // IBL source so materials aren't pitch-black
        this.scene.createDefaultEnvironment({
            createGround: false,
            createSkybox: false,
        });
        // -={ Lighting }=────────────────────────────────────────────────────────._
        const light = new HemisphericLight('mainLight', new Vector3(0, 1, 0), this.scene);
        light.groundColor = new Color3(0.3, 0.3, 0.3);
        light.intensity = 1;

        // -={ Systems }=─────────────────────────────────────────────────────────._
        // Register before addGameObject so the player can access them on start.
        const gameStateSystem = new GameStateSystem(this);

        await gameSystems.register('gameState', gameStateSystem);
        await gameSystems.register('score', new ScoreSystem());
        await gameSystems.register('tiles', new TileScrollingSystem(this.scene));

        // -={ Player }=──────────────────────────────────────────────────────────._
        this.addGameObject('Player', new PlayerObject(this, this.game));
    }

    /**
     * Per-frame update. Freezes all systems when the player is dead.
     * @param deltaTime - Elapsed time in seconds since the last frame.
     */
    override update(deltaTime: number): void {
        super.update(deltaTime);

        // Freeze all systems once the player is dead
        const stateSystem = gameSystems.get('gameState') as GameStateSystem | undefined;
        if (stateSystem?.state === 'dead') {
            return;
        }

        gameSystems.update(deltaTime);
    }
}
