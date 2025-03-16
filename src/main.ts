import '../public/style.css';
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
    const fontPromise = utils.loadImage('images/font-texture-grayscale.png');
    const preloadCursorImages = [
        "images/cursor-pointer32.png",
        "images/cursor-target32.png",
        "images/cursor-green1-32.png",
        "images/cursor-green2-32.png",
        "images/cursor-yellow1-32.png",
        "images/cursor-yellow2-32.png",
        "images/cursor-red1-32.png",
        "images/cursor-red2-32.png",
        "images/scroll-bottom32.png",
        "images/scroll-bottom-left32.png",
        "images/scroll-bottom-right32.png",
        "images/scroll-top32.png",
        "images/scroll-top-left32.png",
        "images/scroll-top-right32.png",
        "images/scroll-left32.png",
        "images/scroll-right32.png"
    ];

    // Preload cursors for performance
    preloadCursorImages.forEach((src) => {
        const img = new Image();
        img.src = src;
    });

    Promise.all([creaturesPromise, tilesPromise, widgetsPromise, fontPromise]).then((images) => {
        document.body.removeChild(loadingText);
        if (!window.game) {
            window.game = new Game(images[0], images[1], images[2], images[3]);

            // Clean up on unload
            window.addEventListener('unload', () => {
                window.game.dispose();
            });
        } else {
            console.error('Game instance already started');
        }
    });
});

