import { CONFIG } from '../config';
import { Game } from '../game';

export class MainMenuManager {
    private startButtonElement: HTMLButtonElement;
    private game: Game;

    constructor(game: Game) {
        this.game = game;
        this.startButtonElement = document.createElement("button");
    }

    mainMenu(): void {
        // Create the start button
        this.startButtonElement.textContent = "Start Game";
        this.startButtonElement.classList.add("btn-start");
        document.body.appendChild(this.startButtonElement);
    }

    getStartButtonElement(): HTMLButtonElement {
        return this.startButtonElement;
    }
}

