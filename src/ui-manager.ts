import { CONFIG } from "./config";

export class UIManager {

    // Command Acknowledged Widget Animation Properties
    widgetAnim: number = 0;
    widgetAnimTotal: number = 6;
    widgetAnimX: number = 0;
    widgetAnimY: number = 0;

    private startButtonElement: HTMLButtonElement;
    private resolutionSelectElement: HTMLSelectElement;
    private documentElementClassList: DOMTokenList; // Css rules rely on this to change cursor.
    private currentCursorClass: string = ""; // Mouse Cursor: cur-pointer, cur-target..

    constructor() {
        this.documentElementClassList = document.documentElement.classList;
        this.startButtonElement = document.createElement("button");
        this.resolutionSelectElement = document.createElement("select");
    }

    mainMenu(): void {
        // Create the start button
        this.startButtonElement.textContent = "Start Game";
        this.startButtonElement.classList.add("btn-start");
        document.body.appendChild(this.startButtonElement);

        // Create the dropdown for screen resolution
        this.resolutionSelectElement.classList.add("resolution-select");

        // Populate the dropdown with options
        for (const { label, width, height } of CONFIG.DISPLAY.RESOLUTIONS) {
            const option = document.createElement("option");
            option.value = `${width}x${height}`;
            option.textContent = label;
            this.resolutionSelectElement.appendChild(option);
        }
        document.body.appendChild(this.resolutionSelectElement);
    }

    setCursor(newClass: string): void {
        if (this.currentCursorClass !== newClass) {
            if (this.currentCursorClass) {
                this.documentElementClassList.remove(this.currentCursorClass);
            }
            this.documentElementClassList.add(newClass);
            this.currentCursorClass = newClass;
        }
    }

    toggleGameMenu(): void {
        console.log('Toggle Options Menu');
        // Further implementation for an in-game options menu.
    }

    animateCursor(): void {
        if (this.widgetAnim) {
            this.widgetAnim += 1;
            if (this.widgetAnim > this.widgetAnimTotal) {
                this.widgetAnim = 0;
            }
        }
    }

    getStartButtonElement(): HTMLButtonElement {
        return this.startButtonElement;
    }

    getResolutionSelectElement(): HTMLSelectElement {
        return this.resolutionSelectElement;
    }

}

