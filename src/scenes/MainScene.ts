import {FreeCamera, HemisphericLight, TargetCamera, Vector3} from '@babylonjs/core';
import {AssetManager, type Game, GameScene, Key} from '@sorskoot/babylon-kit';
import {BusObject} from '../entities/BusObject.ts';

export class MainScene extends GameScene {
    private camera: TargetCamera;

    constructor(
        game: Game,
    ) {
        super(game.getEngine(), game);

    }

    async setup(): Promise<void> {

        this.inputManager.bindAction('forward', {keys: [Key.W, Key.ArrowUp]});
        this.inputManager.bindAction('left', {keys: [Key.A, Key.ArrowLeft]});
        this.inputManager.bindAction('backward', {keys: [Key.S, Key.ArrowDown]});
        this.inputManager.bindAction('right', {keys: [Key.D, Key.ArrowRight]});

        this.camera = new FreeCamera(
            'mainCamera',
            new Vector3(0, 75, 0),
            this.scene,
        );
        this.camera.setTarget(new Vector3(0, 1.5, -25));
    //    this.camera.attachControl(true);
        const globalLight = new HemisphericLight(
            'mainLight',
            new Vector3(0, 1, 0),
            this.scene,
        );
        const artwork = await this.game.assetManager.loadModel(
            'artwork',
            '/assets/models/',
            'Art.glb',
            this.scene,
        );
        const entries = this.game.assetManager.instantiate('artwork',  );
        const busNode = AssetManager.findByMetadataId(entries, "Bus");
        console.log(busNode);
        // Disable all meshes in the container
        for (const mesh of artwork.meshes) {
            mesh.setEnabled(false);
        }

        this.addGameObject('Bus', new BusObject(this, this.game, busNode));
    }

}