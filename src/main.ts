import { Game } from "./game";
import * as utils from "./utils";

document.addEventListener('DOMContentLoaded', (event) => {

    const loadingText = document.createElement('div');
    loadingText.classList.add("loading-text");
    loadingText.textContent = 'Loading...';
    document.body.appendChild(loadingText);

    const creaturesPromise = utils.loadImage('images/alien.png');
    const tilesPromise = utils.loadImage('images/plancher-vertical.png');

    Promise.all([creaturesPromise, tilesPromise]).then((images) => {
        document.body.removeChild(loadingText);
        if (!window.game) {
            window.game = new Game(images[0], images[1]);
        } else {
            console.log('Game instance already started');
        }
    });
});

