import { Game } from "./game";
import * as utils from "./utils";

document.addEventListener('DOMContentLoaded', (event) => {

    const loadingText = document.createElement('div');
    loadingText.classList.add("loading-text");
    loadingText.textContent = 'Loading...';
    document.body.appendChild(loadingText);

    const creaturesPromise = utils.loadImage('images/alien.png');
    const tilesPromise = utils.loadImage('images/map-tiles-vertical.png');
    const widgetsPromise = utils.loadImage('images/animated-widget.png');

    Promise.all([creaturesPromise, tilesPromise, widgetsPromise]).then((images) => {
        document.body.removeChild(loadingText);
        if (!window.game) {
            window.game = new Game(images[0], images[1], images[2]);

            // Clean up on unload
            window.addEventListener('unload', () => {
                window.game.dispose();
            });
        } else {
            console.error('Game instance already started');
        }
    });
});

