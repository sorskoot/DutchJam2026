import {type Game, GameObject, type GameScene} from '@sorskoot/babylon-kit';

export class CarObject extends GameObject {
    constructor(
        name:string,
        scene: GameScene,
        game: Game,
    ) {
        super(name, game, scene);
    }
}
