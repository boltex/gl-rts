import { Game } from "./game";
import { CONFIG } from './config';

export class InputManager {
    private game: Game;
    private keysPressed: Record<string, boolean> = {};
    private selecting: boolean = false;
    public mouseX = 0;  // in gameScreen coordinates.
    public mouseY = 0;
    private gameMouseX = 0; // In game coordinates. with zoom factor applied.
    private gameMouseY = 0;
    public selX = 0;
    public selY = 0;
    private gameSelStartX = 0;
    private gameSelStartY = 0;
    private gameSelEndX = 0;
    private gameSelEndY = 0;
    private scrollNowX = 0;
    private scrollNowY = 0;

    private keyboardUp = false;
    private keyboardDown = false;
    private keyboardLeft = false;
    private keyboardRight = false;

    private keyDownHandler = this.handleKeyDown.bind(this);
    private keyUpHandler = this.handleKeyUp.bind(this);
    private mouseMoveHandler = this.handleMouseMove.bind(this);
    private mouseDownHandler = this.handleMouseDown.bind(this);
    private mouseUpHandler = this.handleMouseUp.bind(this);
    private mouseWheelHandler = this.handleMouseWheel.bind(this);

    constructor(game: Game) {
        this.game = game;
    }

    get gamePosition(): { x: number, y: number } {
        return { x: this.gameMouseX, y: this.gameMouseY };
    }

    get selectionStart(): { x: number, y: number } {
        return { x: this.gameSelStartX, y: this.gameSelStartY };
    }

    get selectionEnd(): { x: number, y: number } {
        return { x: this.gameSelEndX, y: this.gameSelEndY };
    }

    get scrollVelocity(): { dx: number, dy: number } {
        return { dx: this.scrollNowX, dy: this.scrollNowY };
    }

    init(): void {
        window.addEventListener("keydown", this.keyDownHandler);
        window.addEventListener("keyup", this.keyUpHandler);
        window.addEventListener("mousemove", this.mouseMoveHandler);
        window.addEventListener("mousedown", this.mouseDownHandler);
        window.addEventListener("mouseup", this.mouseUpHandler);
        window.addEventListener("wheel", this.mouseWheelHandler, { passive: false });
    }

    dispose(): void {
        window.removeEventListener("keydown", this.keyDownHandler);
        window.removeEventListener("keyup", this.keyUpHandler);
        window.removeEventListener("mousemove", this.mouseMoveHandler);
        window.removeEventListener("mousedown", this.mouseDownHandler);
        window.removeEventListener("mouseup", this.mouseUpHandler);
        window.removeEventListener("wheel", this.mouseWheelHandler);
    }

    private handleKeyDown(e: KeyboardEvent): void {
        // Add tile increment/decrement when map editor is visible.
        if (this.game.uiManager.isMapEditorVisible()) {
            if (e.key === 'NumPad+' || e.key === '+' || (!e.shiftKey && e.key === '=')) {
                e.preventDefault();
                this.game.uiManager.incrementMapTile();
                return;
            }
            if (e.key === 'NumPad-' || e.key === '-' || e.key === '_') {
                e.preventDefault();
                this.game.uiManager.decrementMapTile();
                return;
            }
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();  // Prevent the default save behavior
                this.game.uiManager.saveMapFile();
            }

            if (e.ctrlKey && e.key === 'o') {
                e.preventDefault();  // Prevent the default open behavior
                this.game.uiManager.openMapFile();
            }
        }
        if (e.key === 'F10') {
            e.preventDefault();
            // For now, open the map editor instead of the options menu.
            this.game.uiManager.toggleMapEditor();
            // this.game.uiManager.toggleGameMenu();
            return;
        }
        this.keysPressed[e.key] = true;
        if (e.ctrlKey && (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '_')) {
            e.preventDefault();
        }
    }

    private handleKeyUp(e: KeyboardEvent): void {
        this.keysPressed[e.key] = false;
    }

    private handleMouseMove(event?: MouseEvent): void {
        if (event) {
            this.setCursorPos(event);
        }
        this.scrollNowX = 0;
        this.scrollNowY = 0;

        if (this.game.uiManager.isMapEditorVisible()) {
            if (event && event.buttons === 1) {
                // left
                // Replace the clicked tile on the map with the selected tile in the map editor.
                const tileIndex = this.game.uiManager.getSelectedTileIndex();
                this.game.setTileAt(this.gameMouseX, this.gameMouseY, tileIndex);
            }
            if (event && event.buttons === 2) {
                // right mouse is like the eyedropper tool.
                // Sample the tile index at the clicked position to select it in the map editor.
                this.game.sampleTileAt(this.gameMouseX, this.gameMouseY);
            }
            return;
        }

        if (this.mouseX > this.game.cameraManager.scrollEdgeX) {
            this.scrollNowX = CONFIG.DISPLAY.SCROLL.SPEED;
        }
        if (this.mouseY > this.game.cameraManager.scrollEdgeY) {
            this.scrollNowY = CONFIG.DISPLAY.SCROLL.SPEED;
        }
        if (this.mouseX < CONFIG.DISPLAY.SCROLL.BORDER) {
            this.scrollNowX = -CONFIG.DISPLAY.SCROLL.SPEED;
        }
        if (this.mouseY < CONFIG.DISPLAY.SCROLL.BORDER) {
            this.scrollNowY = -CONFIG.DISPLAY.SCROLL.SPEED;
        }
    }

    private handleMouseDown(event: MouseEvent): void {
        this.setCursorPos(event);
        if (this.game.uiManager.isMapEditorVisible()) {

            if (event.button === 0) {
                // left
                // Replace the clicked tile on the map with the selected tile in the map editor.
                const tileIndex = this.game.uiManager.getSelectedTileIndex();
                this.game.setTileAt(this.gameMouseX, this.gameMouseY, tileIndex);
            }
            if (event.button === 2) {
                // right mouse is like the eyedropper tool.
                // Sample the tile index at the clicked position to select it in the map editor.
                this.game.sampleTileAt(this.gameMouseX, this.gameMouseY);
            }
            return;
        }
        if (!this.selecting) {
            if (event.button === 0) {
                this.selecting = true;
                this.selX = this.mouseX;
                this.selY = this.mouseY;
                this.gameSelStartX = this.selX + this.game.cameraManager.scrollX;
                this.gameSelStartY = this.selY + this.game.cameraManager.scrollY;
                this.game.uiManager.setCursor('cur-target');
            }
            if (event.button === 2) {
                this.game.gameAction = CONFIG.GAME.ACTIONS.DEFAULT;
            }
        }
    }

    private handleMouseUp(event: MouseEvent): void {
        this.setCursorPos(event);
        if (this.game.uiManager.isMapEditorVisible()) {
            // Specific to when the map editor is visible.
            return;
        }
        if (event.button === 0) {
            this.gameSelEndX = this.mouseX + this.game.cameraManager.scrollX;
            this.gameSelEndY = this.mouseY + this.game.cameraManager.scrollY;
            this.selecting = false;
            this.game.gameAction = CONFIG.GAME.ACTIONS.RELEASESEL;
            this.game.uiManager.setCursor('cur-pointer');
        }
    }

    private handleMouseWheel(event: WheelEvent): void {
        if (event.ctrlKey) {
            event.preventDefault();
            event.stopImmediatePropagation();
        }
        if (this.selecting) {
            return; // Do not zoom while selecting
        }
        if (event.deltaY < 0) {
            this.game.cameraManager.zoomIn(this.mouseX, this.mouseY);
        } else if (event.deltaY > 0) {
            this.game.cameraManager.zoomOut(this.mouseX, this.mouseY);
        }
    }

    private setCursorPos(event: MouseEvent): void {
        this.mouseX = event.clientX * (this.game.cameraManager.gameScreenWidth / this.game.canvasBoundingRect.width);
        this.mouseY = event.clientY * (this.game.cameraManager.gameScreenHeight / this.game.canvasBoundingRect.height);
        // Convert to game coordinates into gameMouseX and gameMouseY.
        this.gameMouseX = this.mouseX + this.game.cameraManager.scrollX;
        this.gameMouseY = this.mouseY + this.game.cameraManager.scrollY;
    }

    processInputs(): void {
        if (this.keysPressed['ArrowUp'] || this.keysPressed['w']) {
            this.scrollNowY = -CONFIG.DISPLAY.SCROLL.SPEED;
            this.keyboardUp = true
        } else if (this.keyboardUp) {
            this.keyboardUp = false;
            this.scrollNowY = 0;
            this.handleMouseMove();
        }
        if (this.keysPressed['ArrowDown'] || this.keysPressed['s']) {
            this.scrollNowY = CONFIG.DISPLAY.SCROLL.SPEED;
            this.keyboardDown = true
        } else if (this.keyboardDown) {
            this.keyboardDown = false;
            this.scrollNowY = 0;
            this.handleMouseMove();
        }
        if (this.keysPressed['ArrowLeft'] || this.keysPressed['a']) {
            this.scrollNowX = -CONFIG.DISPLAY.SCROLL.SPEED;
            this.keyboardLeft = true
        } else if (this.keyboardLeft) {
            this.keyboardLeft = false;
            this.scrollNowX = 0;
            this.handleMouseMove();
        }
        if (this.keysPressed['ArrowRight'] || this.keysPressed['d']) {
            this.scrollNowX = CONFIG.DISPLAY.SCROLL.SPEED;
            this.keyboardRight = true
        } else if (this.keyboardRight) {
            this.keyboardRight = false;
            this.scrollNowX = 0;
            this.handleMouseMove();
        }

        // Scroll if not currently dragging a selection.
        if (!this.selecting) {
            this.game.cameraManager.scroll(this.scrollVelocity);
        }
    }

    get isSelecting(): boolean {
        return this.selecting;
    }


}

