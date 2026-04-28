import {Game} from '@sorskoot/babylon-kit';
import {MainScene} from './scenes/MainScene';

async function init(): Promise<void> {
    const game = new Game('gameCanvas');

    const mainScene = new MainScene(game);

    await game.sceneManager.addScene('main', mainScene);
    await game.sceneManager.switchTo('main');

    game.start();
}

await init();
