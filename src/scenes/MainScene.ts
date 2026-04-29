import {Color3, FreeCamera, HemisphericLight, TargetCamera, Vector3} from '@babylonjs/core';
import {AssetManager, type Game, GameScene, Key} from '@sorskoot/babylon-kit';
import {BusObject} from '../entities/BusObject.ts';
import {ObstacleSpawnerSystem} from '../systems/ObstacleSpawnerSystem.ts';
import {RoadScrollingSystem} from '../systems/RoadScrollingSystem.ts';
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
            new Vector3(0, 25, 25),
            this.scene,
        );
        this.camera.setTarget(new Vector3(0, 1.5, -10));
        //    this.camera.attachControl(true);

        // Default environment gives PBR materials an IBL source – without it
        // any material with metallic / reflectivity properties renders black.
        this.scene.createDefaultEnvironment({
            createGround: false,
            createSkybox: false,
        });

        const light = new HemisphericLight(
            'mainLight',
            new Vector3(0, 1, 0),
            this.scene,
        );
        // Give the "ground" side a mid-grey fill so road surfaces facing away
        // from the sky (e.g. underside normals) are not pure black.
        light.groundColor = new Color3(0.3, 0.3, 0.3);
        light.intensity = 1.2;
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
        void cars; // loaded for future use by obstacle spawner
        // Contains: RoadSegment_10m, Road_Line_Continues and Road_Line_Striped
        // RoadSegment has 5 3.5m lanes + .5 extra asphalt on both sides + 5m grass on each side.
        await this.game.assetManager.loadModel(
            'Road',
            '/assets/models/',
            'RoadFlat.glb', this.scene,
        );
        // const carEntries = this.game.assetManager.instantiate('cars'  );
        // console.log(carEntries);

        const entries = this.game.assetManager.instantiate('artwork');
        const busNode = AssetManager.findByMetadataId(entries, 'Bus')!;

        //const redCar = metadataRepository.getById("Car_Red");
        // console.log(AssetManager.findByMetadataId(carEntries, "Car_Red"));

        // Disable all meshes in the container
        for (const mesh of artwork.meshes) {
            mesh.setEnabled(false);
        }

        this.addGameObject('Bus', new BusObject(this, this.game, busNode));

        gameSystems.register('score', new ScoreSystem());
        gameSystems.register('road', new RoadScrollingSystem(this.game.assetManager));
        const obstacleSpawnerSystem = new ObstacleSpawnerSystem();
        //obstacleSpawnerSystem.registerPrefab(metadataRepository.getById('Car_Red'));
        gameSystems.register('ObstacleSpawner', obstacleSpawnerSystem);

    }

    update(deltaTime: number) {
        super.update(deltaTime);
        gameSystems.update(deltaTime);
    }

}