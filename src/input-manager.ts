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
    private minimapDragging: boolean = false;
    private dragScrolling: boolean = false;
    private borderScrolling: boolean = false;
    public mouseInScreen = true;
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
    private mouseEnterHandler = this.handleMouseEnter.bind(this);
    private mouseLeaveHandler = this.handleMouseLeave.bind(this);
    private mouseMoveHandler = this.handleMouseMove.bind(this);
    private mouseDownHandler = this.handleMouseDown.bind(this);
    private mouseUpHandler = this.handleMouseUp.bind(this);
    private mouseWheelHandler = this.handleMouseWheel.bind(this);

    constructor(game: Game) {
        this.game = game;
        this.keyboardSpeed = CONFIG.CAMERA.SCROLL.KEYBOARD_SPEEDS[CONFIG.CAMERA.SCROLL.DEFAULT_KEYBOARD_SPEED].value;
        this.scrollSpeed = CONFIG.CAMERA.SCROLL.SCROLL_SPEEDS[CONFIG.CAMERA.SCROLL.DEFAULT_SCROLL_SPEED].value;
        this.dragSpeed = CONFIG.CAMERA.SCROLL.DRAG_SPEEDS[CONFIG.CAMERA.SCROLL.DEFAULT_DRAG_SPEED].value;
        this.invertDrag = CONFIG.CAMERA.SCROLL.DEFAULT_DRAG_INVERT;
    }

    setKeyboardSpeed(keyboardSpeed: number): void {
        this.keyboardSpeed = keyboardSpeed;
    }

    setScrollSpeed(scrollSpeed: number): void {
        this.scrollSpeed = scrollSpeed;
    }

    setDragSpeed(dragSpeed: number, invertDrag: boolean): void {
        this.dragSpeed = dragSpeed;
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
        document.documentElement.addEventListener("mouseenter", this.mouseEnterHandler);
        document.documentElement.addEventListener("mouseleave", this.mouseLeaveHandler);
        window.addEventListener("mousemove", this.mouseMoveHandler);
        window.addEventListener("mousedown", this.mouseDownHandler);
        window.addEventListener("mouseup", this.mouseUpHandler);
        window.addEventListener("wheel", this.mouseWheelHandler, { passive: false });
    }

    dispose(): void {
        window.removeEventListener("keydown", this.keyDownHandler);
        window.removeEventListener("keyup", this.keyUpHandler);
        document.documentElement.removeEventListener("mouseenter", this.mouseEnterHandler);
        document.documentElement.removeEventListener("mouseleave", this.mouseLeaveHandler);
        window.removeEventListener("mousemove", this.mouseMoveHandler);
        window.removeEventListener("mousedown", this.mouseDownHandler);
        window.removeEventListener("mouseup", this.mouseUpHandler);
        window.removeEventListener("wheel", this.mouseWheelHandler);
    }

    private handleKeyDown(e: KeyboardEvent): void {

        // TODO : The top conditions in this method could be improved! More things should be prevented by default.
        // For example, the default behavior of the 'F5' or keyboard zooms +/- should also be prevented by default.

        if (this.game.editorManager.isMapEditorOpen) {
            // Only when in Map Editor (Add tile inc/dec and ctrl+s/ctrl+o shortcuts)
            if (e.key === 'NumPad+' || e.key === '+' || (!e.shiftKey && e.key === '=')) {
                e.preventDefault();
                this.game.editorManager.incrementMapTile();
                return;
            }
            if (e.key === 'NumPad-' || e.key === '-' || e.key === '_') {
                e.preventDefault();
                this.game.editorManager.decrementMapTile();
                return;
            }
            if (e.ctrlKey && (e.key === 's' || e.key === 'o')) {
                e.preventDefault();  // Prevent the default save/open behavior
            }

            if (this.game.editorManager.isAnimationPreviewVisible) {
                // If spacebar is pressed, toggle play/pause animation preview.
                if (e.key === ' ') {
                    e.preventDefault();
                    this.game.editorManager.toggleAnimationPlayPause();
                    return;
                }

                // If 'a' or 'd' are pressed, rotate the orientation of the preview left/right.
                if (e.key === 'a' || e.key === 'd') {
                    e.preventDefault();
                    this.game.editorManager.rotatePreview(e.key === 'a' ? -1 : 1);
                    return;
                }

                // If left/right arrows are pressed, change selected frame.
                if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                    e.preventDefault();
                    this.game.editorManager.changeSelectedFrame(e.key === 'ArrowLeft' ? -1 : 1);
                    return;
                }

                // If up/down arrows are pressed, change the sprite number at the current frame.
                if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    this.game.editorManager.changeSpriteNumber(e.key === 'ArrowUp' ? 1 : -1);
                    return;
                }

            }


        } else if (!this.game.optionsMenuManager.isMenuOpen) {
            // Only when not in map editor nor game menu (game speed shortcuts)
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

        if (this.game.started) {
            // Only when the game has started (game shortcuts)
            if (e.key === 'F1') {
                e.preventDefault();
                if (this.game.optionsMenuManager.isMenuOpen || this.game.editorManager.isMapEditorOpen) {
                    return;
                }
                this.game.helpMenuManager.toggleHelp();
                return;
            }
            if (e.key === 'F5' || e.ctrlKey && e.key === 'r') {
                e.preventDefault();
                return;
            }
            if (e.key === 'F9') {
                e.preventDefault();
                if (this.game.optionsMenuManager.isMenuOpen || this.game.helpMenuManager.isHelpMenuOpen) {
                    return;
                }
                this.selecting = false;
                this.dragScrolling = false;
                this.game.editorManager.toggleMapEditor();
                return;
            }
            if (e.key === 'F10') {
                e.preventDefault();
                if (this.game.optionsMenuManager.isMenuOpen || this.game.helpMenuManager.isHelpMenuOpen) {
                    return; // Use the ok or cancel buttons instead.
                }
                this.selecting = false;
                this.dragScrolling = false;
                this.game.optionsMenuManager.toggleMenu();
                return;
            }
            if (e.key === 'F6') {
                e.preventDefault();
                if (!this.game.optionsMenuManager.isMenuOpen) {
                    this.game.cameraManager.resetZoom();
                }
                return;
            }
            // Check for the 'escape' key and close the options menu if it's open.
            if (e.key === 'Escape') {
                e.preventDefault();
                if (this.game.optionsMenuManager.isMenuOpen) {
                    this.game.optionsMenuManager.cancelMenu();
                    return;
                }
                if (this.game.helpMenuManager.isHelpMenuOpen) {
                    this.game.helpMenuManager.toggleHelp();
                    return;
                }

                // TODO : If interface is waiting for a target (e.g. building placement), cancel that action.

            }
            // Check for CTRL+ALT+F for toggling 'showFPS' option.
            if (e.ctrlKey && e.altKey && e.key === 'f') {
                e.preventDefault();
                this.game.toggleShowFPS();
                return;
            }
            // Check for Ctrl+m to toggle the music.
            if (e.ctrlKey && e.key === 'm') {
                e.preventDefault();
                this.game.toggleMusic();
                return;
            }
            // Check for Ctrl+s to toggle the sound.
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.game.toggleSound();
                return;
            }
            if (e.ctrlKey && (e.key === 'o')) {
                e.preventDefault();  // Prevent the default open behavior
            }
            // Check for 'tab' to toggle the minimap terrain visibility.
            if (e.key === 'Tab') {
                e.preventDefault();
                this.game.toggleTerrain();
                return;
            }

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

    private handleMouseEnter(event: MouseEvent): void {
        this.mouseInScreen = true;
    }

    private handleMouseLeave(event: MouseEvent): void {
        this.mouseInScreen = false;
    }

    private handleMouseMove(event: MouseEvent): void {
        // ignore if not started or in game menu
        if (!this.game.started || this.game.optionsMenuManager.isMenuOpen || this.game.helpMenuManager.isHelpMenuOpen) {
            return;
        }
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

            // Update the cursor to reflect the drag direction based on scrollNowX and scrollNowY.
            let cursor = 'cur-none';

            // Only update if we're actually moving
            if (this.scrollNowX !== 0 || this.scrollNowY !== 0) {
                // Calculate the angle in radians
                const angle = Math.atan2(this.scrollNowY, this.scrollNowX);

                // Convert to degrees (0-360)
                let degrees = angle * 180 / Math.PI;
                if (degrees < 0) {
                    degrees += 360;
                }

                // Determine direction based on angle with 45-degree segments (±22.5° around each direction)
                if ((degrees >= 337.5 || degrees < 22.5)) {
                    cursor = 'cur-scroll-right';
                } else if (degrees >= 22.5 && degrees < 67.5) {
                    cursor = 'cur-scroll-bottom-right';
                } else if (degrees >= 67.5 && degrees < 112.5) {
                    cursor = 'cur-scroll-bottom';
                } else if (degrees >= 112.5 && degrees < 157.5) {
                    cursor = 'cur-scroll-bottom-left';
                } else if (degrees >= 157.5 && degrees < 202.5) {
                    cursor = 'cur-scroll-left';
                } else if (degrees >= 202.5 && degrees < 247.5) {
                    cursor = 'cur-scroll-top-left';
                } else if (degrees >= 247.5 && degrees < 292.5) {
                    cursor = 'cur-scroll-top';
                } else if (degrees >= 292.5 && degrees < 337.5) {
                    cursor = 'cur-scroll-top-right';
                }
            }
            this.game.cursorManager.setCursor(cursor);
        }
        this.setCursorPos(event);
        if (this.minimapDragging) {
            // Check minimap first
            if (this.handleMinimapInteraction()) {
                return;
            }
        }
        // Map editor mode
        if (this.game.editorManager.isMapEditorOpen) {
            if (this.handleMapEditorInteraction(event)) {
                return;
            }
            // We only returned if it was a click that interacted with the map editor.
        }
        this.applyMouseScroll();
    }

    private handleMinimapInteraction(): boolean {
        const cameraManager = this.game.cameraManager;

        // Calculate minimap bounds
        const minimapPadding = 10 / cameraManager.zoom;
        const minimapDisplaySize = Math.min(cameraManager.gameScreenWidth, cameraManager.gameScreenHeight) / 5;
        const minimapX = minimapPadding;
        const minimapY = cameraManager.gameScreenHeight - minimapDisplaySize - minimapPadding;

        // Check if cursor is within minimap bounds, or if it's currently dragging the minimap
        if (this.minimapDragging ||
            this.mouseX >= minimapX &&
            this.mouseX <= minimapX + minimapDisplaySize &&
            this.mouseY >= minimapY &&
            this.mouseY <= minimapY + minimapDisplaySize) {

            // Calculate world position from minimap coordinates
            const mapWorldWidth = CONFIG.GAME.MAP.WIDTH * CONFIG.GAME.TILE.SIZE;
            const mapWorldHeight = CONFIG.GAME.MAP.HEIGHT * CONFIG.GAME.TILE.SIZE;

            // Clamp mouse position to minimap bounds because we allowed dragging outside the minimap
            const cappedMouseX = Math.min(Math.max(this.mouseX, minimapX), minimapX + minimapDisplaySize);
            const cappedmouseY = Math.min(Math.max(this.mouseY, minimapY), minimapY + minimapDisplaySize);

            // Calculate relative position within minimap (0 to 1)
            const minimapRelativeX = (cappedMouseX - minimapX) / minimapDisplaySize;
            const minimapRelativeY = (cappedmouseY - minimapY) / minimapDisplaySize;

            // Convert to world position
            const worldX = minimapRelativeX * mapWorldWidth;
            const worldY = minimapRelativeY * mapWorldHeight;

            // Center the camera on this position
            cameraManager.scrollX = worldX - (cameraManager.gameScreenWidth / 2);
            cameraManager.scrollY = worldY - (cameraManager.gameScreenHeight / 2);

            // Ensure camera stays within bounds
            cameraManager.scroll();
            this.minimapDragging = true;
            return true;
        }
        return false;
    }

    private handleMapEditorInteraction(event: MouseEvent): boolean {
        // Make sure the event is over the canvas, not the map editor UI
        if (event.target !== this.game.canvasElement) {
            return false;
        }

        // Use buttons for move events, button for down events
        const isLeftButton = event.type === 'mousedown' ? event.button === 0 : event.buttons === 1;
        const isRightButton = event.type === 'mousedown' ? event.button === 2 : event.buttons === 2;

        if (isLeftButton) {
            // Replace the clicked tile with the selected one
            const tileIndex = this.game.editorManager.getSelectedTileIndex();
            this.game.setTileAt(this.gameMouseX, this.gameMouseY, tileIndex);
            return true;
        }

        if (isRightButton) {
            // Sample the tile at the clicked position
            this.game.sampleTileAt(this.gameMouseX, this.gameMouseY);
            return true;
        }

        return false;
    }

    /**
     * Set the scroll velocity based on the mouse position.
     */
    private applyMouseScroll(): void {
        if (!this.selecting) {
            if (!this.dragScrolling) {
                this.scrollNowX = 0;
                this.scrollNowY = 0;
            }
            const fps = this.game.timeManager.fps || 1; // Avoid division by zero.
            let cursor: string | undefined;
            const camera = this.game.cameraManager;
            const scrollSpeed = this.scrollSpeed * (30 / fps);
            if (this.mouseY > camera.scrollEdgeYMax && camera.scrollY < camera.maxScrollY) {
                this.scrollNowY = scrollSpeed;
                cursor = 'cur-scroll-bottom';
            } else if (this.mouseY < camera.scrollEdgeYMin && camera.scrollY > 0) {
                this.scrollNowY = -scrollSpeed;
                cursor = 'cur-scroll-top';
            }
            if (this.mouseX > camera.scrollEdgeXMax && camera.scrollX < camera.maxScrollX) {
                this.scrollNowX = scrollSpeed;
                if (cursor) {
                    cursor += '-right';
                } else {
                    cursor = 'cur-scroll-right';
                }
            } else if (this.mouseX < camera.scrollEdgeXMin && camera.scrollX > 0) {
                this.scrollNowX = -scrollSpeed;
                if (cursor) {
                    cursor += '-left';
                } else {
                    cursor = 'cur-scroll-left';
                }
            }
            if (cursor) {
                this.borderScrolling = true;
                this.game.cursorManager.setCursor(cursor);
            } else if (!this.dragScrolling) {
                this.game.cursorManager.setCursor('cur-pointer');
                this.borderScrolling = false;
            } else {
                this.borderScrolling = false;
            }
        }
    }

    private handleMouseDown(event: MouseEvent): void {
        this.setCursorPos(event);

        // ignore if not started or in game menu
        if (!this.game.started || this.game.optionsMenuManager.isMenuOpen || this.game.helpMenuManager.isHelpMenuOpen) {
            return;
        }

        // for both game and map editor.
        if (event.button === 1) {
            // middle mouse is drag-scroll.
            if (!this.dragScrolling) {
                this.dragScrolling = true;
                // No cursor when dragging.
                this.game.cursorManager.setCursor('cur-none');
            }
        }

        // Map editor mode
        if (this.game.editorManager.isMapEditorOpen) {
            this.handleMapEditorInteraction(event);
            return; // We return here to avoid the default behavior.
        }

        if (!this.selecting) {
            if (event.button === 0) {
                // Check minimap first
                if (this.handleMinimapInteraction()) {
                    return;
                }
                this.selecting = true;
                this.selX = this.mouseX;
                this.selY = this.mouseY;
                this.gameSelStartX = this.selX + this.game.cameraManager.scrollX;
                this.gameSelStartY = this.selY + this.game.cameraManager.scrollY;
                this.game.cursorManager.setCursor('cur-target');
            }
            if (event.button === 2) {
                this.game.gameAction = CONFIG.GAME.ACTIONS.DEFAULT;
            }
        }

    }

    private handleMouseUp(event: MouseEvent): void {
        this.setCursorPos(event);

        // ignore if not started or in game menu
        if (!this.game.started || this.game.optionsMenuManager.isMenuOpen || this.game.helpMenuManager.isHelpMenuOpen) {
            return;
        }

        // for both game and map editor.
        if (event.button === 1) {
            this.dragScrolling = false;
            // now restore cursor.
            if (this.selecting) {
                this.game.cursorManager.setCursor('cur-target');
            } else {
                this.game.cursorManager.setCursor('cur-pointer');
            }
        }

        if (this.game.editorManager.isMapEditorOpen) {
            // special case for map editor, if needed.
            return
        }

        if (event.button === 0) {
            this.minimapDragging = false; // In case it was dragging the camera on the minimap.
            this.gameSelEndX = this.mouseX + this.game.cameraManager.scrollX;
            this.gameSelEndY = this.mouseY + this.game.cameraManager.scrollY;
            this.selecting = false;
            this.game.gameAction = CONFIG.GAME.ACTIONS.RELEASESEL;
            // now restore cursor.
            if (this.dragScrolling) {
                this.game.cursorManager.setCursor('cur-none');
            } else {
                this.game.cursorManager.setCursor('cur-pointer');
            }
        }

    }

    private handleMouseWheel(event: WheelEvent): void {
        if (event.ctrlKey) {
            event.preventDefault();
            event.stopImmediatePropagation();
        }
        // ignore in game menu,  while selecting or if not started
        if (!this.game.started || this.selecting || this.game.optionsMenuManager.isMenuOpen || this.game.helpMenuManager.isHelpMenuOpen) {
            return;
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
        // ignore in game menu
        if (this.game.optionsMenuManager.isMenuOpen || this.game.helpMenuManager.isHelpMenuOpen) {
            return;
        }
        const fps = this.game.timeManager.fps || 1; // Avoid division by zero.

        // keyboard needs to be scaled for 30fps
        if (this.keysPressed['ArrowUp'] || this.keysPressed['w']) {
            this.scrollNowY = -this.keyboardSpeed * (30 / fps);
            this.keyboardUp = true
        } else if (this.keyboardUp) {
            this.keyboardUp = false;
            this.scrollNowY = 0;
            this.applyMouseScroll();
        }
        if (this.keysPressed['ArrowDown'] || this.keysPressed['s']) {
            this.scrollNowY = this.keyboardSpeed * (30 / fps);
            this.keyboardDown = true
        } else if (this.keyboardDown) {
            this.keyboardDown = false;
            this.scrollNowY = 0;
            this.applyMouseScroll();
        }
        if (this.keysPressed['ArrowLeft'] || this.keysPressed['a']) {
            this.scrollNowX = -this.keyboardSpeed * (30 / fps);
            this.keyboardLeft = true
        } else if (this.keyboardLeft) {
            this.keyboardLeft = false;
            this.scrollNowX = 0;
            this.applyMouseScroll();
        }
        if (this.keysPressed['ArrowRight'] || this.keysPressed['d']) {
            this.scrollNowX = this.keyboardSpeed * (30 / fps);
            this.keyboardRight = true
        } else if (this.keyboardRight) {
            this.keyboardRight = false;
            this.scrollNowX = 0;
            this.applyMouseScroll();
        }

        // Scroll if not currently dragging a selection and in the game area.
        if (!this.selecting && this.mouseInScreen) {
            this.game.cameraManager.scroll(this.scrollVelocity);
            if (this.dragScrolling && !this.borderScrolling) {
                // Reset velocity to 0 after scrolling.
                this.scrollNowX = 0;
                this.scrollNowY = 0;
            }
        }
    }

    get isSelecting(): boolean {
        return this.selecting;
    }


}

