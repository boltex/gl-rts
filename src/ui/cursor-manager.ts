import { CONFIG } from '../config';
import { Game } from '../game';

export class CursorManager {
    // Command Acknowledged Widget Animation Properties
    widgetAnim: number = 0;
    widgetAnimTotal: number = CONFIG.UI.WIDGET.ANIMATION_FRAMES;
    widgetAnimX: number = 0;
    widgetAnimY: number = 0;

    private documentElementClassList: DOMTokenList;
    private currentCursorClass: string = ""; // Mouse Cursor: cur-pointer, cur-target...

    private game: Game;

    constructor(game: Game) {
        this.game = game;
        this.documentElementClassList = document.documentElement.classList;
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

    animateCursor(): void {
        if (this.widgetAnim) {
            this.widgetAnim += 1;
            if (this.widgetAnim > this.widgetAnimTotal) {
                this.widgetAnim = 0;
            }
        }
    }

}

