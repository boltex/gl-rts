import { Game } from "./game";
import { CONFIG } from './config';

export class InputManager {
    private game: Game;
    private keyboardSpeed: number;
    private scrollSpeed: number;
    private dragSpeed: number;
    private invertDrag: boolean = false;

    private keysPressed: Record<string, boolean> = {};
    private selecting: boolean = false;
    private dragScrolling: boolean = false;
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
    private lastMouseX = 0
    private lastMouseY = 0;

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
        this.keyboardSpeed = CONFIG.CAMERA.SCROLL.KEYBOARD_SPEEDS[CONFIG.CAMERA.SCROLL.DEFAULT_KEYBOARD_SPEED].value;
        this.scrollSpeed = CONFIG.CAMERA.SCROLL.SCROLL_SPEEDS[CONFIG.CAMERA.SCROLL.DEFAULT_SCROLL_SPEED].value;
        this.dragSpeed = CONFIG.CAMERA.SCROLL.DRAG_SPEEDS[CONFIG.CAMERA.SCROLL.DEFAULT_DRAG_SPEED].value;
        this.invertDrag = false;
    }

    setKeyboardSpeed(keyboardSpeedIndex: number): void {
        this.keyboardSpeed = CONFIG.CAMERA.SCROLL.KEYBOARD_SPEEDS[keyboardSpeedIndex].value;
    }

    setScrollSpeed(scrollSpeedIndex: number): void {
        this.scrollSpeed = CONFIG.CAMERA.SCROLL.SCROLL_SPEEDS[scrollSpeedIndex].value;
    }

    setDragSpeed(dragSpeedIndex: number, invertDrag: boolean): void {
        this.dragSpeed = CONFIG.CAMERA.SCROLL.DRAG_SPEEDS[dragSpeedIndex].value;
        this.invertDrag = invertDrag;
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
            if (e.ctrlKey && (e.key === 's' || e.key === 'o')) {
                e.preventDefault();  // Prevent the default save/open behavior
            }
        } else {
            // Only when not in map editor.
            if (e.key === 'NumPad+' || e.key === '+' || (!e.shiftKey && e.key === '=')) {
                e.preventDefault();
                this.game.incrementGameSpeed();
                return;
            }
            if (e.key === 'NumPad-' || e.key === '-' || e.key === '_') {
                e.preventDefault();
                this.game.decrementGameSpeed();
                return;
            }
        }
        if (e.key === 'F5' || e.ctrlKey && e.key === 'r') {
            e.preventDefault();
            return;
        }
        if (e.key === 'F9') {
            e.preventDefault();
            this.game.uiManager.toggleMapEditor();
            return;
        }
        if (e.key === 'F10') {
            e.preventDefault();
            this.game.uiManager.toggleGameMenu();
            return;
        }
        if (e.key === 'F6') {
            e.preventDefault();
            this.game.cameraManager.resetZoom();
            return;
        }

        // To keep track of which keys are currently pressed.
        this.keysPressed[e.key] = true;

        // If Ctrl + + or Ctrl + - is pressed, prevent the browser from zooming in or out.
        if (e.ctrlKey && (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '_')) {
            e.preventDefault();
        }
    }

    private handleKeyUp(e: KeyboardEvent): void {
        this.keysPressed[e.key] = false;
    }

    private handleMouseMove(event?: MouseEvent): void {

        if (event) {
            if (this.dragScrolling) {
                // first, calculate the difference between the last mouse position and the current one.
                let dragX = this.lastMouseX - event.clientX;
                let dragY = this.lastMouseY - event.clientY;

                // Already 'inverted' so flip it if not inverted.
                if (!this.invertDrag) {
                    dragX = -dragX;
                    dragY = -dragY;
                }

                // Then, convert the difference to game coordinates.
                this.scrollNowX = this.dragSpeed * dragX * (this.game.cameraManager.gameScreenWidth / this.game.canvasBoundingRect.width);
                this.scrollNowY = this.dragSpeed * dragY * (this.game.cameraManager.gameScreenHeight / this.game.canvasBoundingRect.height);
            }
            this.setCursorPos(event);
        }

        if (this.game.uiManager.isMapEditorVisible()) {
            // Make sure the event click is over the canvas, not the map editor.
            if (event && event.target !== this.game.canvasElement) {
                return;
            }
            if (event && event.buttons === 1) {
                // left
                // Replace the clicked tile on the map with the selected tile in the map editor.
                const tileIndex = this.game.uiManager.getSelectedTileIndex();
                this.game.setTileAt(this.gameMouseX, this.gameMouseY, tileIndex);
                return;
            }
            if (event && event.buttons === 2) {
                // right mouse is like the eyedropper tool.
                // Sample the tile index at the clicked position to select it in the map editor.
                this.game.sampleTileAt(this.gameMouseX, this.gameMouseY);
                return;
            }
        }

        if (!this.dragScrolling) {
            this.scrollNowX = 0;
            this.scrollNowY = 0;
            // normal mouse move, check if near the edge of the screen to scroll.
            if (this.mouseX > this.game.cameraManager.scrollEdgeX) {
                this.scrollNowX = this.scrollSpeed;
            }
            if (this.mouseY > this.game.cameraManager.scrollEdgeY) {
                this.scrollNowY = this.scrollSpeed;
            }
            if (this.mouseX < CONFIG.CAMERA.SCROLL.BORDER) {
                this.scrollNowX = -this.scrollSpeed;
            }
            if (this.mouseY < CONFIG.CAMERA.SCROLL.BORDER) {
                this.scrollNowY = -this.scrollSpeed;
            }
        }

    }

    private handleMouseDown(event: MouseEvent): void {
        this.setCursorPos(event);
        // for both game and map editor.
        if (event.button === 1) {
            // middle mouse is drag-scroll.
            if (!this.dragScrolling) {
                this.dragScrolling = true;
                // No cursor when dragging.
                this.game.uiManager.setCursor('cur-none');
            }
        }

        if (this.game.uiManager.isMapEditorVisible()) {

            // Make sure the event click is over the canvas, not the map editor.
            if (event.target !== this.game.canvasElement) {
                return;
            }

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
        if (event.button === 1) {
            this.dragScrolling = false;
            // Set cursor back to normal. target if selecting, pointer otherwise.
            this.game.uiManager.setCursor('cur-target');
            if (this.selecting) {
            } else {
                this.game.uiManager.setCursor('cur-pointer');
            }
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
            this.game.cameraManager.zoomIn();
        } else if (event.deltaY > 0) {
            this.game.cameraManager.zoomOut();
        }
    }

    setCursorPos(event?: MouseEvent): void {
        let x, y;
        if (event) {
            x = event.clientX;
            y = event.clientY;
            this.lastMouseX = x;
            this.lastMouseY = y;
        } else {
            x = this.lastMouseX;
            y = this.lastMouseY;
        }
        this.mouseX = x * (this.game.cameraManager.gameScreenWidth / this.game.canvasBoundingRect.width);
        this.mouseY = y * (this.game.cameraManager.gameScreenHeight / this.game.canvasBoundingRect.height);
        // Convert to game coordinates into gameMouseX and gameMouseY.
        this.gameMouseX = this.mouseX + this.game.cameraManager.scrollX;
        this.gameMouseY = this.mouseY + this.game.cameraManager.scrollY;
    }

    processInputs(): void {
        if (this.keysPressed['ArrowUp'] || this.keysPressed['w']) {
            this.scrollNowY = -this.keyboardSpeed;
            this.keyboardUp = true
        } else if (this.keyboardUp) {
            this.keyboardUp = false;
            this.scrollNowY = 0;
            this.handleMouseMove();
        }
        if (this.keysPressed['ArrowDown'] || this.keysPressed['s']) {
            this.scrollNowY = this.keyboardSpeed;
            this.keyboardDown = true
        } else if (this.keyboardDown) {
            this.keyboardDown = false;
            this.scrollNowY = 0;
            this.handleMouseMove();
        }
        if (this.keysPressed['ArrowLeft'] || this.keysPressed['a']) {
            this.scrollNowX = -this.keyboardSpeed;
            this.keyboardLeft = true
        } else if (this.keyboardLeft) {
            this.keyboardLeft = false;
            this.scrollNowX = 0;
            this.handleMouseMove();
        }
        if (this.keysPressed['ArrowRight'] || this.keysPressed['d']) {
            this.scrollNowX = this.keyboardSpeed;
            this.keyboardRight = true
        } else if (this.keyboardRight) {
            this.keyboardRight = false;
            this.scrollNowX = 0;
            this.handleMouseMove();
        }

        // Scroll if not currently dragging a selection.
        if (!this.selecting) {
            this.game.cameraManager.scroll(this.scrollVelocity);
            if (this.dragScrolling) {
                // Reset veolcity to 0 after scrolling.
                this.scrollNowX = 0;
                this.scrollNowY = 0;
            }
        }
    }

    get isSelecting(): boolean {
        return this.selecting;
    }


}

