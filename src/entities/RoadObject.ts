import {type Game, GameObject, type GameScene} from '@sorskoot/babylon-kit';

export class RoadObject extends GameObject {
    constructor(
        scene: GameScene,
        game: Game,
    ) {
        super("Road", game, scene);
    }
}
