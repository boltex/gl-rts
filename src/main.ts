import { Game } from "./game";

document.addEventListener('DOMContentLoaded', (event) => {
    if (!window.game) {
        window.game = new Game();
    } else {
        console.log('Game instance already started');
    }
});

