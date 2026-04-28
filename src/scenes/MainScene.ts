import {FreeCamera, HemisphericLight, TargetCamera, Vector3} from '@babylonjs/core';
import {AssetManager, type Game, GameScene, Key, metadataRepository} from '@sorskoot/babylon-kit';
import {BusObject} from '../entities/BusObject.ts';
import {ObstacleSpawnerSystem} from '../systems/ObstacleSpawnerSystem.ts';
import {ScoreSystem} from '../systems/ScoreSystem.ts';
import {gameSystems} from '../systems/SystemBase.ts';

export class MainScene extends GameScene {
    private declare camera: TargetCamera;

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
        new HemisphericLight(
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
         const cars = await this.game.assetManager.loadModel(
             'cars',
             '/assets/models/',
             'Cars.glb',
             this.scene,
         );

        // const carEntries = this.game.assetManager.instantiate('cars'  );
        // console.log(carEntries);

        const entries = this.game.assetManager.instantiate('artwork',  );
        const busNode = AssetManager.findByMetadataId(entries, "Bus")!;

        //const redCar = metadataRepository.getById("Car_Red");
        // console.log(AssetManager.findByMetadataId(carEntries, "Car_Red"));

        // Disable all meshes in the container
        for (const mesh of artwork.meshes) {
            mesh.setEnabled(false);
        }

        this.addGameObject('Bus', new BusObject(this, this.game, busNode));

        gameSystems.register("score", new ScoreSystem());
        const obstacleSpawnerSystem = new ObstacleSpawnerSystem();

        obstacleSpawnerSystem.registerPrefab(metadataRepository.getById("Car_Red"));

        gameSystems.register("ObstacleSpawner", obstacleSpawnerSystem);

    }

     update(deltaTime: number){
        super.update(deltaTime);
         gameSystems.update(deltaTime);
     }

}