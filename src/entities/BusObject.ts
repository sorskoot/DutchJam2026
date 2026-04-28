import {Mesh, Vector3} from '@babylonjs/core';
import {AssetManager, type Game, GameObject, type GameScene, metadataRepository} from '@sorskoot/babylon-kit';

export class BusObject extends GameObject {
    constructor(
        scene: GameScene,
        game: Game,
        bus:Mesh,
    ) {
        super("Bus", game, scene);

        // const busData = metadataRepository.getById("Bus");
        // if(!busData) {
        //     throw new Error("No bus data found.");
        // }
        // if (busData.mesh) {
        //     busData.mesh.setEnabled(true);
        //     // Also enable child meshes
        //     for (const child of busData.mesh.getChildTransformNodes(false)) {
        //         child.setEnabled(true);
        //     }
        // }
        this.node = bus;
        this.node.rotate(new Vector3(0, 1, 0), -Math.PI/2);
    }

    public onStart(): void {}

    public onUpdate(_deltaTime: number): void {
        if (this.scene.getInputManager().isActionHeld("left")) {
            this.position.x -= .1;
        }
        if (this.scene.getInputManager().isActionHeld("right")) {
            this.position.x += .1;
        }
    }

}