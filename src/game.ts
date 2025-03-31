import { RendererManager } from "./renderer-manager";
import { InputManager } from "./input-manager";
import { Behaviors } from "./behaviors";
import { Entities } from "./entities";
import { CONFIG } from './config';
import { EntityType, TRectangle, TSelectAnim, Settings, EntityAnimation, TEntity } from "./types";
import { CameraManager } from "./camera-manager";
import { TimeManager } from "./time-manager";
import { CursorManager } from "./ui/cursor-manager";
import { EditorManager } from "./ui/editor-manager";
import { FileManager } from "./ui/file-manager";
import { MainMenuManager } from "./ui/main-menu-manager";
import { OptionsMenuManager } from "./ui/options-menu-manager";
import * as utils from "./utils";
import { AudioManager } from "./audio-manager";
import { HelpMenuManager } from "./ui/help-menu-manager";

export class Game {

    // Manager classes
    inputManager: InputManager;
    rendererManager: RendererManager;
    cameraManager: CameraManager;
    timeManager: TimeManager;
    cursorManager: CursorManager;
    helpMenuManager: HelpMenuManager;
    mainMenuManager: MainMenuManager;
    optionsMenuManager: OptionsMenuManager;
    fileManager: FileManager;
    editorManager: EditorManager;
    audioManager: AudioManager;

    // Canvas Properties
    lastDisplayWidth = 0;
    lastDisplayHeight = 0;
    canvasElement: HTMLCanvasElement;
    canvasBoundingRect: DOMRect;
    gl: WebGL2RenderingContext;

    // Game options
    resolutionIndex: number = CONFIG.DISPLAY.DEFAULT_RESOLUTION; // Affects cameraManager.resolution
    gameSpeedIndex: number = CONFIG.GAME.TIMING.DEFAULT_SPEED; // Affects timeManager.timePerTick
    keyboardSpeedIndex: number = CONFIG.CAMERA.SCROLL.DEFAULT_KEYBOARD_SPEED; // Affects inputManager.keyboardSpeed
    scrollSpeedIndex: number = CONFIG.CAMERA.SCROLL.DEFAULT_SCROLL_SPEED; // Affects inputManager.scrollSpeed
    dragSpeedIndex: number = CONFIG.CAMERA.SCROLL.DEFAULT_DRAG_SPEED; // Affects inputManager.dragSpeed
    invertDrag: boolean = CONFIG.CAMERA.SCROLL.DEFAULT_DRAG_INVERT; // Affects inputManager.invertDrag
    musicEnabled: boolean = true;
    musicVolume: number = 50;
    soundEnabled: boolean = true;
    soundVolume: number = 50;

    // Game editor state
    previewEntity: TEntity | null = null;

    // Game state Properties
    started: boolean = false;
    isMultiplayer: boolean = false;
    showFPS: boolean = false;
    gamemap: number[] = [];
    gameMapChanged: boolean = true;
    minimapRect: TRectangle[] = [
        {
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            r: 1, // White
            g: 1,
            b: 1,
            a: 0.15
        }
    ];
    gameAction: number = 0;    // 0 = none
    entities!: Entities;
    entityBehaviors!: Behaviors;
    lastScrollX = -1; // initialized at -1 so that we can detect first frame.
    lastScrollY = -1;
    lastScreenWidth = -1;
    lastScreenHeight = -1;
    animations: EntityAnimation[] = [];

    private startGameHandler = this.startGame.bind(this);
    private handleContextMenu = (event: MouseEvent) => event.preventDefault();
    private resizeObserver: ResizeObserver;

    constructor(sprites: HTMLImageElement, tiles: HTMLImageElement, widgets: HTMLImageElement, font: HTMLImageElement) {

        this.canvasElement = document.createElement('canvas');
        document.body.appendChild(this.canvasElement);

        this.canvasBoundingRect = this.canvasElement.getBoundingClientRect();

        const gl = this.canvasElement.getContext('webgl2');
        if (gl) {
            this.gl = gl; // ok, we have a WebGL2 context
        } else {
            throw new Error('WebGL2 not supported in this browser'); // Error handling
        }

        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        this.gl.clearColor(0.0, 0.0, 0.0, 0.0); // transparent black

        // Prevent right-click context menu
        document.addEventListener('contextmenu', this.handleContextMenu);

        // Canvas has style width: 100vw; and style height: 100vh; so we need to handle resizes!
        const debouncedResize = utils.debounce(this.handleCanvasResize.bind(this), 250);
        this.resizeObserver = new ResizeObserver(debouncedResize);
        this.resizeObserver.observe(this.canvasElement, { box: 'content-box' });

        this.timeManager = new TimeManager();
        this.cameraManager = new CameraManager(this);
        this.rendererManager = new RendererManager(this.gl, tiles, sprites, widgets, font);
        this.inputManager = new InputManager(this);
        this.inputManager.init(); // Start even before game start to prevent zooming.
        this.resizeCanvasToDisplaySize(this.canvasElement);
        this.fileManager = new FileManager(this);
        this.cursorManager = new CursorManager(this);
        this.helpMenuManager = new HelpMenuManager(this);
        this.mainMenuManager = new MainMenuManager(this);
        this.optionsMenuManager = new OptionsMenuManager(this);
        this.editorManager = new EditorManager(this, this.fileManager);
        this.audioManager = new AudioManager(this);

        // Load settings from local storage at start. Those are saved when users presses ok in settings dialog.
        this.loadSettingsLocalStorage();

        this.mainMenuManager.mainMenu();
        this.mainMenuManager.getStartButtonElement().addEventListener("click", this.startGameHandler);
    }

    dispose(): void {
        this.rendererManager.dispose();
        document.removeEventListener('contextmenu', this.handleContextMenu);
        this.mainMenuManager.getStartButtonElement().removeEventListener("click", this.startGameHandler);
        this.resizeObserver.unobserve(this.canvasElement);
        this.resizeObserver.disconnect();
        this.inputManager.dispose();
    }

    handleCanvasResize(entries: ResizeObserverEntry[]): void {
        for (const entry of entries) {
            const { width: displayWidth, height: displayHeight } = utils.getDisplaySize(entry);
            this.lastDisplayWidth = displayWidth;
            this.lastDisplayHeight = displayHeight;
            this.canvasBoundingRect = this.canvasElement.getBoundingClientRect();
            this.cameraManager.updateProperties(this.canvasBoundingRect);
        }
    }

    resizeCanvasToDisplaySize(canvas: HTMLCanvasElement): boolean {
        const displayWidth = this.lastDisplayWidth;
        const displayHeight = this.lastDisplayHeight;

        const needResize = canvas.width !== displayWidth || canvas.height !== displayHeight;
        if (needResize) {
            // Set the canvas dimensions to the display size
            canvas.width = displayWidth;
            canvas.height = displayHeight;

            // Set the viewport to fill the canvas
            this.gl.viewport(0, 0, canvas.width, canvas.height); // This will also clear the canvas  
            if (this.rendererManager && this.rendererManager.worldBuffer) {
                this.rendererManager.setUboWorldTransforms(this.cameraManager.gameScreenWidth, this.cameraManager.gameScreenHeight);
            }
        }
        return needResize;
    }

    startGame(): void {
        this.cameraManager.setResolution(CONFIG.DISPLAY.RESOLUTIONS[this.resolutionIndex]);
        this.cameraManager.updateProperties(this.canvasBoundingRect);
        this.rendererManager.setUboWorldTransforms(this.cameraManager.gameScreenWidth, this.cameraManager.gameScreenHeight);

        this.cursorManager.setCursor("cur-pointer");

        this.mainMenuManager.getStartButtonElement().style.display = 'none';

        this.initGameStates();
        this.started = true;
        this.timeManager.lastTime = performance.now();
        setInterval(() => { this.checkUpdate(); }, CONFIG.GAME.TIMING.CHECK_UPDATE_INTERVAL); // Setup timer in case RAF Skipped when minimized
        this.loop(0);
    }

    initGameStates(): void {
        this.entities = new Entities(CONFIG.GAME.ENTITY.INITIAL_POOL_SIZE);
        this.entityBehaviors = new Behaviors(this);
        // Prepare a 'default' animation of 10 frames going from 1 to 10.
        this.animations.push({
            label: 'default',
            frames: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
        });

        // Fill Entities pool
        // EXPERIMENTAL TEST: Create 3 test Aliens
        // 1
        let alien = this.entities.spawn();
        alien.type = EntityType.ALIEN;
        alien.hitPoints = 100;
        alien.size = 128;
        alien.x = 1100;
        alien.y = 1100;
        alien.frameIndex = 33;
        alien.orientation = 6;
        // 2
        alien = this.entities.spawn();
        alien.type = EntityType.ALIEN;
        alien.hitPoints = 100;
        alien.size = 128;
        alien.x = 0;
        alien.y = 0;
        alien.frameIndex = 212;
        alien.orientation = 5;
        // 3
        alien = this.entities.spawn();
        alien.type = EntityType.ALIEN;
        alien.hitPoints = 100;
        alien.size = 128;
        alien.x = 455;
        alien.y = 455;
        alien.frameIndex = 122;
        alien.orientation = 14;

        // Build Map (Will later be bigger maps loaded from file)
        // Use Config.GAME.MAP.WIDTH and Config.GAME.MAP.HEIGHT
        // For now, just fill with random tiles
        this.gamemap = []; // AS a linear array of size Config.GAME.MAP.WIDTH * Config.GAME.MAP.HEIGHT
        for (let i = 0; i < CONFIG.GAME.MAP.WIDTH * CONFIG.GAME.MAP.HEIGHT; i++) {
            this.gamemap.push(Math.floor(Math.random() * 16));
        }
    }

    toggleShowFPS(): void {
        this.showFPS = !this.showFPS;
    }

    setResolution(resolutionIndex: number): void {
        this.resolutionIndex = resolutionIndex;
        this.cameraManager.setResolution(CONFIG.DISPLAY.RESOLUTIONS[this.resolutionIndex]);
        this.cameraManager.updateProperties(this.canvasBoundingRect);
        this.cameraManager.scroll({ dx: 0, dy: 0 });
        this.rendererManager.setUboWorldTransforms(this.cameraManager.gameScreenWidth, this.cameraManager.gameScreenHeight);
    }

    setGameSpeed(speedIndex: number): void {
        // Single player only. Prevent if multiplayer.
        if (this.isMultiplayer) {
            return;
        }
        if (speedIndex >= 0 && speedIndex < CONFIG.GAME.TIMING.GAME_SPEEDS.length) {
            this.gameSpeedIndex = speedIndex;
            this.timeManager.setGameSpeed(CONFIG.GAME.TIMING.GAME_SPEEDS[this.gameSpeedIndex].value);
        }
    }

    incrementGameSpeed(): void {
        // Single player only. Prevent if multiplayer.
        if (this.isMultiplayer) {
            return;
        }
        this.gameSpeedIndex += 1;
        if (this.gameSpeedIndex >= CONFIG.GAME.TIMING.GAME_SPEEDS.length) {
            this.gameSpeedIndex = CONFIG.GAME.TIMING.GAME_SPEEDS.length - 1;
        }
        this.timeManager.setGameSpeed(CONFIG.GAME.TIMING.GAME_SPEEDS[this.gameSpeedIndex].value);
    }

    decrementGameSpeed(): void {
        // Single player only. Prevent if multiplayer.
        if (this.isMultiplayer) {
            return;
        }
        this.gameSpeedIndex -= 1;
        if (this.gameSpeedIndex < 0) {
            this.gameSpeedIndex = 0;
        }
        this.timeManager.setGameSpeed(CONFIG.GAME.TIMING.GAME_SPEEDS[this.gameSpeedIndex].value);
    }

    setKeyboardSpeed(speedIndex: number): void {
        if (speedIndex >= 0 && speedIndex < CONFIG.CAMERA.SCROLL.KEYBOARD_SPEEDS.length) {
            this.keyboardSpeedIndex = speedIndex;
            this.inputManager.setKeyboardSpeed(CONFIG.CAMERA.SCROLL.KEYBOARD_SPEEDS[this.keyboardSpeedIndex].value);
        }
    }

    incrementKeyboardSpeed(): void {
        this.keyboardSpeedIndex += 1;
        if (this.keyboardSpeedIndex >= CONFIG.CAMERA.SCROLL.KEYBOARD_SPEEDS.length) {
            this.keyboardSpeedIndex = CONFIG.CAMERA.SCROLL.KEYBOARD_SPEEDS.length - 1;
        }
        this.inputManager.setKeyboardSpeed(CONFIG.CAMERA.SCROLL.KEYBOARD_SPEEDS[this.keyboardSpeedIndex].value);
    }

    decrementKeyboardSpeed(): void {
        this.keyboardSpeedIndex -= 1;
        if (this.keyboardSpeedIndex < 0) {
            this.keyboardSpeedIndex = 0;
        }
        this.inputManager.setKeyboardSpeed(CONFIG.CAMERA.SCROLL.KEYBOARD_SPEEDS[this.keyboardSpeedIndex].value);
    }

    setScrollSpeed(speedIndex: number): void {
        if (speedIndex >= 0 && speedIndex < CONFIG.CAMERA.SCROLL.SCROLL_SPEEDS.length) {
            this.scrollSpeedIndex = speedIndex;
            this.inputManager.setScrollSpeed(CONFIG.CAMERA.SCROLL.SCROLL_SPEEDS[this.scrollSpeedIndex].value);
        }
    }

    incrementScrollSpeed(): void {
        this.scrollSpeedIndex += 1;
        if (this.scrollSpeedIndex >= CONFIG.CAMERA.SCROLL.SCROLL_SPEEDS.length) {
            this.scrollSpeedIndex = CONFIG.CAMERA.SCROLL.SCROLL_SPEEDS.length - 1;
        }
        this.inputManager.setScrollSpeed(CONFIG.CAMERA.SCROLL.SCROLL_SPEEDS[this.scrollSpeedIndex].value);
    }

    decrementScrollSpeed(): void {
        this.scrollSpeedIndex -= 1;
        if (this.scrollSpeedIndex < 0) {
            this.scrollSpeedIndex = 0;
        }
        this.inputManager.setScrollSpeed(CONFIG.CAMERA.SCROLL.SCROLL_SPEEDS[this.scrollSpeedIndex].value);
    }

    setDragSpeed(speedIndex: number): void {
        if (speedIndex >= 0 && speedIndex < CONFIG.CAMERA.SCROLL.DRAG_SPEEDS.length) {
            this.dragSpeedIndex = speedIndex;
            this.inputManager.setDragSpeed(CONFIG.CAMERA.SCROLL.DRAG_SPEEDS[this.dragSpeedIndex].value, this.invertDrag);
        }
    }

    incrementDragSpeed(): void {
        this.dragSpeedIndex += 1;
        if (this.dragSpeedIndex >= CONFIG.CAMERA.SCROLL.DRAG_SPEEDS.length) {
            this.dragSpeedIndex = CONFIG.CAMERA.SCROLL.DRAG_SPEEDS.length - 1;
        }
        this.inputManager.setDragSpeed(CONFIG.CAMERA.SCROLL.DRAG_SPEEDS[this.dragSpeedIndex].value, this.invertDrag);
    }

    decrementDragSpeed(): void {
        this.dragSpeedIndex -= 1;
        if (this.dragSpeedIndex < 0) {
            this.dragSpeedIndex = 0;
        }
        this.inputManager.setDragSpeed(CONFIG.CAMERA.SCROLL.DRAG_SPEEDS[this.dragSpeedIndex].value, this.invertDrag);
    }

    changeInvertDrag(invert: boolean): void {
        this.invertDrag = invert;
        this.inputManager.setDragSpeed(CONFIG.CAMERA.SCROLL.DRAG_SPEEDS[this.dragSpeedIndex].value, this.invertDrag);
    }

    procGame(): void {

        if (this.gameAction) {

            switch (this.gameAction) {
                case CONFIG.GAME.ACTIONS.DEFAULT:
                    this.defaultAction();
                    break;
                case CONFIG.GAME.ACTIONS.RELEASESEL:
                    this.selectUnits();
                    break;

                default:
                    break;
            }

        }

        this.gameAction = 0; // Reset game action after processing

        this.inputManager.processInputs();

    }

    update(timestamp: number, skipRender?: boolean): void {

        // 0. Optimize for performance
        const cursorManager = this.cursorManager;
        const cameraManager = this.cameraManager;
        const inputManager = this.inputManager;
        const timeManager = this.timeManager;

        // 1. Update time
        const deltaTime = timeManager.update(timestamp);

        // 2. Process immediate user input actions
        cameraManager.animateZoom();
        this.procGame();

        // 3. Update constant speed animations if needed
        while (timeManager.shouldAnimUpdate()) {
            // Animate cursor and UI hud, minimap, etc. at specific constant speed
            cursorManager.animateCursor();
        }

        // 4. Update game logic at specific game-speed if needed
        while (timeManager.shouldTickUpdate()) {
            // Advance game states in pool from currentTick count, to the next one.
            // This is the game logic update, at chosen game speed:
            // slowest, slower, slow, normal, fast, faster, fastest.
            this.tick();
        }

        // 5. Render
        if (!skipRender) {
            // Before rendering, resize canvas to display size. (in case of changing window size)
            this.resizeCanvasToDisplaySize(this.canvasElement)

            // Text to render, such as animation frame number, APM or FPS.
            const text: [number, number, number, number][] = []; // X, Y, Char Index, Scale

            const visibleTiles: [number, number, number][] = []; // X, Y and Tile Index

            // If camera did not move nor zoom, we can reuse the last visible tiles by leaving visibleTiles empty.
            const cameraChanged = cameraManager.scrollX !== this.lastScrollX ||
                cameraManager.scrollY !== this.lastScrollY ||
                cameraManager.gameScreenWidth !== this.lastScreenWidth ||
                cameraManager.gameScreenHeight !== this.lastScreenHeight;
            if (
                this.gameMapChanged || cameraChanged
            ) {
                // Save for next frame to check if camera moved.
                this.lastScreenWidth = cameraManager.gameScreenWidth;
                this.lastScreenHeight = cameraManager.gameScreenHeight;
                this.lastScrollX = cameraManager.scrollX;
                this.lastScrollY = cameraManager.scrollY;
                const tilesize = CONFIG.GAME.TILE.SIZE;
                const tileoffx = Math.floor(this.lastScrollX / tilesize);
                const tileoffy = Math.floor(this.lastScrollY / tilesize);
                let rangex = (this.lastScreenWidth / tilesize) + 1;
                let rangey = (this.lastScreenHeight / tilesize) + 1;
                if (this.lastScrollX % tilesize > tilesize - (this.lastScreenWidth % tilesize)) {
                    rangex += 1;
                }
                if (this.lastScrollY % tilesize > tilesize - (this.lastScreenHeight % tilesize)) {
                    rangey += 1;
                }
                for (let y = 0; y < rangey; y++) {
                    for (let x = 0; x < rangex; x++) {
                        const a = this.gamemap[(tileoffx + x) + ((tileoffy + y) * (CONFIG.GAME.MAP.WIDTH))];
                        visibleTiles.push(
                            [x * tilesize - (this.lastScrollX % tilesize),
                            y * tilesize - (this.lastScrollY % tilesize),
                                a]
                        );

                    }
                }
            }

            // Selection lines with four thin rectangles, if user is selecting.
            const cursor: TRectangle[] = [];
            if (inputManager.isSelecting) {
                // Draw selection rectangle with lines
                const cx1 = Math.min(inputManager.selX, inputManager.mouseX);
                const cx2 = Math.max(inputManager.selX, inputManager.mouseX);
                const cy1 = Math.min(inputManager.selY, inputManager.mouseY);
                const cy2 = Math.max(inputManager.selY, inputManager.mouseY);
                const thickness = 2 / cameraManager.zoom; // Divide by zoom to keep thickness constant
                cursor.push(
                    // Top, bottom, left, right lines
                    { x: cx1, y: cy1, width: cx2 - cx1, height: thickness, r: 0, g: 1, b: 0, a: 1 },
                    { x: cx1, y: cy2, width: cx2 - cx1, height: thickness, r: 0, g: 1, b: 0, a: 1 },
                    { x: cx1, y: cy1, width: thickness, height: cy2 - cy1, r: 0, g: 1, b: 0, a: 1 },
                    { x: cx2, y: cy1, width: thickness, height: cy2 - cy1, r: 0, g: 1, b: 0, a: 1 }
                );
            }

            // Minimap camera view rectangle
            if (cameraChanged) {
                // Calculate minimap properties (match those used in MinimapRenderer.updateTransformData)
                const minimapPadding = 10 / cameraManager.zoom;
                const minimapDisplaySize = Math.min(cameraManager.gameScreenWidth, cameraManager.gameScreenHeight) / CONFIG.UI.MINIMAP_RATIO;
                const minimapX = minimapPadding;
                const minimapY = cameraManager.gameScreenHeight - minimapDisplaySize - minimapPadding;

                // Calculate the scale ratio between world space and minimap space
                const mapWorldWidth = CONFIG.GAME.MAP.WIDTH * CONFIG.GAME.TILE.SIZE;
                const mapWorldHeight = CONFIG.GAME.MAP.HEIGHT * CONFIG.GAME.TILE.SIZE;
                const minimapScale = minimapDisplaySize / Math.max(mapWorldWidth, mapWorldHeight);

                // Calculate viewport rectangle in minimap coordinates
                this.minimapRect[0].x = minimapX + (cameraManager.scrollX * minimapScale);
                this.minimapRect[0].y = minimapY + (cameraManager.scrollY * minimapScale);
                this.minimapRect[0].width = cameraManager.gameScreenWidth * minimapScale;
                this.minimapRect[0].height = cameraManager.gameScreenHeight * minimapScale;
            }

            // If the map Editor is toggled, add a grid to the visible tiles, also highlight the mouse scroll zones. Also do animations if needed.
            if (this.editorManager.isMapEditorOpen) {

                const thickness = 2 / cameraManager.zoom; // Divide by zoom to keep thickness constant
                const tilesize = CONFIG.GAME.TILE.SIZE;

                // if the animation preview is not shown, (map mode) draw the grid lines.
                if (this.editorManager.editorMode === "map") {
                    // Draw horizontal grid lines
                    for (let y = 0; y <= CONFIG.GAME.MAP.HEIGHT; y++) {
                        const lineY = y * tilesize - (this.lastScrollY % tilesize);
                        cursor.push(
                            { x: 0, y: lineY, width: this.lastScreenWidth, height: thickness, r: 1, g: 1, b: 1, a: 1 }
                        );
                    }

                    // Draw vertical grid lines 
                    for (let x = 0; x <= CONFIG.GAME.MAP.WIDTH; x++) {
                        const lineX = x * tilesize - (this.lastScrollX % tilesize);
                        cursor.push(
                            { x: lineX, y: 0, width: thickness, height: this.lastScreenHeight, r: 1, g: 1, b: 1, a: 1 }
                        );
                    }
                }

                // Draw a full rectangle over the tile which contains the current mouse pointer.
                const tileoffx = Math.floor(cameraManager.scrollX / tilesize);
                const tileoffy = Math.floor(cameraManager.scrollY / tilesize);
                const x = Math.floor((inputManager.mouseX + cameraManager.scrollX) / tilesize) - tileoffx;
                const y = Math.floor((inputManager.mouseY + cameraManager.scrollY) / tilesize) - tileoffy;
                cursor.push(
                    { x: x * tilesize - (this.lastScrollX % tilesize), y: y * tilesize - (this.lastScrollY % tilesize), width: tilesize, height: tilesize, r: 1, g: 1, b: 1, a: 0.2 }
                );

                // If animation preview is visible, make sure the special entity is present in the entities pool.
                // If already there, just update its position, orientation and frame index. 
                // Make sure its centered in the screen relative to the scroll (instead of being fixed on the game map), and also very big.
                if (this.editorManager.editorMode === "animation") {
                    const editorManager = this.editorManager;
                    if (!this.previewEntity) {
                        // spawn it
                        this.previewEntity = this.entities.spawn();
                        this.previewEntity.type = EntityType.ALIEN;
                        this.previewEntity.hitPoints = 100;
                    }

                    // Update its position, size, orientation and frame index.
                    this.previewEntity.x = this.lastScreenWidth / 2 + this.lastScrollX;
                    this.previewEntity.y = this.lastScreenHeight / 2 + this.lastScrollY;
                    this.previewEntity.orientation = editorManager.previewAnimationOrientation;
                    // Make it bigger than the other entities, And compensate for zoom to be constant on screen.
                    this.previewEntity.size = 128 * 4 / cameraManager.zoom;

                    // Now translate x and y so that it is centered instead of having its top-left corner at origin
                    this.previewEntity.x -= this.previewEntity.size / 2;
                    this.previewEntity.y -= this.previewEntity.size / 2;

                    const animIndex = editorManager.currentAnimIndex;
                    const previewFrame = editorManager.previewAnimationFrame;
                    const animations = this.animations
                    this.previewEntity.frameIndex = animations[animIndex].frames[previewFrame];

                    // Add text underneath to show the current frame index.
                    const frameIndex = animations[animIndex].frames[previewFrame];
                    const frameString = `Frame: ${previewFrame} of 0-${animations[animIndex].frames.length - 1} (R: ${this.previewEntity.orientation})`;
                    const spriteString = `Sprite ${frameIndex} `
                    // Loop each letter in the string and add to the text array
                    let x = cameraManager.gameScreenWidth / 2 - this.previewEntity.size / 2;
                    let y = cameraManager.gameScreenHeight / 2 - this.previewEntity.size / 2;
                    for (let i = 0; i < frameString.length; i++) {
                        const charIndex = frameString.charCodeAt(i) - 32;
                        text.push([x, y, charIndex, 32 / cameraManager.zoom]);
                        x += CONFIG.FONT_SIZES[charIndex] / cameraManager.zoom;
                    }
                    x = cameraManager.gameScreenWidth / 2 - this.previewEntity.size / 2;
                    y = cameraManager.gameScreenHeight / 2 + 128 / cameraManager.zoom;
                    for (let i = 0; i < spriteString.length; i++) {
                        const charIndex = spriteString.charCodeAt(i) - 32;
                        text.push([x, y, charIndex, 32 / cameraManager.zoom]);
                        x += CONFIG.FONT_SIZES[charIndex] / cameraManager.zoom;
                    }
                } else {
                    // editor manager is not open, so remove the preview entity if it exists.
                    if (this.previewEntity) {
                        this.entities.remove(this.previewEntity);
                        this.previewEntity = null;
                    }
                }
            } else {
                // editor manager is not open, so remove the preview entity if it exists.
                if (this.previewEntity) {
                    this.entities.remove(this.previewEntity);
                    this.previewEntity = null;
                }
            }

            // Animated selection widget, if any.
            const visibleWidgets: [number, number, number, number][] = []; // X, Y and Tile Index
            if (cursorManager.widgetAnim > 0) {
                visibleWidgets.push([
                    cursorManager.widgetAnimX - cameraManager.scrollX,
                    cursorManager.widgetAnimY - cameraManager.scrollY,
                    cursorManager.widgetAnimFrames[cursorManager.widgetAnim], // 0-3 are other, animate 6 frames from 4 to 9.
                    CONFIG.GAME.WIDGETS.SIZE / 2  // half of 128 is 64
                ]);
            }

            if (this.showFPS) {
                const fps = 'FPS: ' + timeManager.fps.toString();
                // Loop each letter in the string and add to the text array
                let x = 20 / cameraManager.zoom;
                for (let i = 0; i < fps.length; i++) {
                    const charIndex = fps.charCodeAt(i) - 32;
                    text.push([x, 20 / cameraManager.zoom, charIndex, 32 / cameraManager.zoom]);
                    x += CONFIG.FONT_SIZES[charIndex] / cameraManager.zoom;
                }
            }

            this.rendererManager.render(
                visibleTiles,
                this.entities.pool,
                cursor,
                this.minimapRect,
                visibleWidgets,
                text,
                cameraManager,
                timeManager.getInterpolation(),
                this.gamemap,
                this.gameMapChanged
            );

            this.gameMapChanged = false; // This now has been rendered.
        }

        // 6. FPS
        timeManager.updateFps(timestamp, deltaTime);
    }

    checkUpdate(): void {
        // Checks for needed ticks to be computed if game is minimized
        const timestamp = performance.now();
        if (this.timeManager.needCatchUp(timestamp)) {
            this.update(timestamp, true);
        }
    }

    tick(): void {

        // Advance game states in pool from currentTick count, to the next one.
        let processed = 0;
        let entity;

        // if the map editor is open and the animation preview is visible, process the preview entity only.
        if (this.editorManager.isMapEditorOpen && this.editorManager.editorMode === "animation") {

            for (let i = 0; processed < this.entities.active || i < this.entities.total; i++) {
                entity = this.entities.pool[i];
                if (entity.active) {
                    processed += 1;
                    this.entityBehaviors.preview(entity);
                }
            }

        } else {

            // Process the real entities
            for (let i = 0; processed < this.entities.active || i < this.entities.total; i++) {
                entity = this.entities.pool[i];
                if (entity.active) {
                    processed += 1;
                    this.entityBehaviors.process(entity);
                }
            }

        }

    }

    loop(timestamp: number): void {
        this.update(timestamp);
        requestAnimationFrame(this.loop.bind(this));
    }

    defaultAction(): void {

        // * This is the 'default' action for a context sensitive right-click (on ground is move, on ennemy is attack, )

        const gamePosition = this.inputManager.gamePosition;

        // TODO : First check if the mouse is over the minimap, 
        // if so, consider the default action to be done on the ground of the coordinates of the minimap. (usually move command)

        // TODO : Replace test cursor animation with the real default action
        // FOR NOW: START WIDGET ANIMATION ON DEFAULT ACTION
        this.cursorManager.widgetAnim = 1;
        this.cursorManager.widgetAnimX = gamePosition.x - 32;
        this.cursorManager.widgetAnimY = gamePosition.y - 32;
    }

    selectUnits(): void {

        // Called from procGame
        const selectionStart = this.inputManager.selectionStart;
        const selectionEnd = this.inputManager.selectionEnd;

        // console.log('select', selectionStart.x, selectionStart.y, selectionEnd.x, selectionEnd.y);
        // TODO : Add selection logic here

    }

    toggleMusic(): void {
        this.musicEnabled = !this.musicEnabled;
        this.audioManager.setMusicVolume(this.musicEnabled ? this.musicVolume / 100 : 0);
    }

    setMusicEnabled(value: boolean): void {
        this.musicEnabled = value;
        this.audioManager.setMusicVolume(this.musicEnabled ? this.musicVolume / 100 : 0);
    }

    setMusicVolume(volume: number): void {
        this.musicVolume = volume;
        this.audioManager.setMusicVolume(this.musicEnabled ? this.musicVolume / 100 : 0);
    }

    incrementMusicVolume(): void {
        this.musicVolume += 5;
        this.musicVolume = Math.ceil(this.musicVolume / 5) * 5;
        if (this.musicVolume > 100) {
            this.musicVolume = 100;
        }
        this.audioManager.setMusicVolume(this.musicEnabled ? this.musicVolume / 100 : 0);
    }

    decrementMusicVolume(): void {
        this.musicVolume -= 5;
        this.musicVolume = Math.ceil(this.musicVolume / 5) * 5;
        if (this.musicVolume < 0) {
            this.musicVolume = 0;
        }
        this.audioManager.setMusicVolume(this.musicEnabled ? this.musicVolume / 100 : 0);
    }

    toggleSound(): void {
        this.soundEnabled = !this.soundEnabled;
        this.audioManager.setSoundVolume(this.soundEnabled ? this.soundVolume / 100 : 0);
    }

    setSoundEnabled(value: boolean): void {
        this.soundEnabled = value;
        this.audioManager.setSoundVolume(this.soundEnabled ? this.soundVolume / 100 : 0);
    }

    setSoundVolume(volume: number): void {
        this.soundVolume = volume;
        this.audioManager.setSoundVolume(this.soundEnabled ? this.soundVolume / 100 : 0);
    }

    incrementSoundVolume(): void {
        this.soundVolume += 5;
        this.soundVolume = Math.ceil(this.soundVolume / 5) * 5;
        if (this.soundVolume > 100) {
            this.soundVolume = 100;
        }
        this.audioManager.setSoundVolume(this.soundEnabled ? this.soundVolume / 100 : 0);
    }

    decrementSoundVolume(): void {
        this.soundVolume -= 5;
        this.soundVolume = Math.ceil(this.soundVolume / 5) * 5;
        if (this.soundVolume < 0) {
            this.soundVolume = 0;
        }
        this.audioManager.setSoundVolume(this.soundEnabled ? this.soundVolume / 100 : 0);
    }

    toggleTerrain(): void {
        this.rendererManager.toggleTerrain();
        this.gameMapChanged = true;
    }

    setTileAt(gameMouseX: number, gameMouseY: number, tileIndex: number): void {
        // Replace tile in gameMap at gameMouseX, gameMouseY with tileIndex
        // So we need to know the tile size, and the scroll position. Also set gameMapChanged.

        const tilesize = CONFIG.GAME.TILE.SIZE;
        // Convert game coordinates to tile grid coordinates
        const tileX = Math.floor(gameMouseX / tilesize);
        const tileY = Math.floor(gameMouseY / tilesize);
        // Compute the tile index for the linear gamemap array
        const index = tileX + (tileY * CONFIG.GAME.MAP.WIDTH);

        if (index < 0 || index >= this.gamemap.length) {
            console.warn(`Tile position out of bounds: (${tileX}, ${tileY})`);
            return;
        }

        this.gamemap[index] = tileIndex;
        this.gameMapChanged = true;
    }

    sampleTileAt(gameMouseX: number, gameMouseY: number): void {
        // This is the opposite of setTileAt, it samples the tile at gameMouseX, gameMouseY
        // and sets the UI to the selected tile.
        const tilesize = CONFIG.GAME.TILE.SIZE;
        // Convert game coordinates to tile grid coordinates
        const tileX = Math.floor(gameMouseX / tilesize);
        const tileY = Math.floor(gameMouseY / tilesize);
        // Compute the tile index in the gamemap
        const index = tileX + (tileY * CONFIG.GAME.MAP.WIDTH);

        if (index < 0 || index >= this.gamemap.length) {
            console.warn(`Tile position out of bounds: (${tileX}, ${tileY})`);
            return;
        }

        const sampledTile = this.gamemap[index];

        this.editorManager.setTileSelectIndex(sampledTile);
    }

    saveMap(mapData?: number[], filename?: string) {
        if (!mapData) {
            mapData = this.gamemap;
        }
        if (!filename) {
            filename = `map_${CONFIG.GAME.MAP.WIDTH}_${CONFIG.GAME.MAP.HEIGHT}.json`;

        }
        const jsonString = JSON.stringify(mapData, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });

        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = filename;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }


    openMap(jsonData: number[]) {
        // Load the map from a JSON file
        this.gamemap = jsonData;
        this.gameMapChanged = true;
    }

    saveEntities(): void {
        // TODO : Save the entities list (only for active, not all pool)
        console.log("Save Entities!");
    }

    openEntities(): void {
        // TODO : Open an entities list from file, replacing the current entities list
        // The file is a JSON file containing an array of entities
        console.log("Open Entities!");
    }

    saveAnimations(animations?: EntityAnimation[]): void {
        if (!animations) {
            animations = this.animations;
        }
        const jsonString = JSON.stringify(animations, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });

        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "animations.json";

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    openAnimations(jsonData: EntityAnimation[]): void {
        // Load the animations from a JSON file
        this.animations = jsonData;
        // Refresh the editor's animations list
        this.editorManager.updateAnimationPreview();
    }

    saveSettingsLocalStorage(): void {
        const settings: Settings = {
            resolutionIndex: this.resolutionIndex,
            gameSpeedIndex: this.gameSpeedIndex,
            keyboardSpeedIndex: this.keyboardSpeedIndex,
            scrollSpeedIndex: this.scrollSpeedIndex,
            dragSpeedIndex: this.dragSpeedIndex,
            invertDrag: this.invertDrag,
            musicEnabled: this.musicEnabled,
            musicVolume: this.musicVolume,
            soundEnabled: this.soundEnabled,
            soundVolume: this.soundVolume
        };
        localStorage.setItem('settings', JSON.stringify(settings));
    }

    loadSettingsLocalStorage(): void {
        const settings = localStorage.getItem('settings');
        // If inexistant settings, the defaults will remain.
        if (settings) {
            const parsedSettings = JSON.parse(settings);

            this.resolutionIndex = parsedSettings.resolutionIndex ?? this.resolutionIndex;
            this.gameSpeedIndex = parsedSettings.gameSpeedIndex ?? this.gameSpeedIndex;
            this.keyboardSpeedIndex = parsedSettings.keyboardSpeedIndex ?? this.keyboardSpeedIndex;
            this.scrollSpeedIndex = parsedSettings.scrollSpeedIndex ?? this.scrollSpeedIndex;
            this.dragSpeedIndex = parsedSettings.dragSpeedIndex ?? this.dragSpeedIndex;
            this.invertDrag = parsedSettings.invertDrag ?? this.invertDrag;
            this.musicEnabled = parsedSettings.musicEnabled ?? this.musicEnabled;
            this.musicVolume = parsedSettings.musicVolume ?? this.musicVolume;
            this.soundEnabled = parsedSettings.soundEnabled ?? this.soundEnabled;
            this.soundVolume = parsedSettings.soundVolume ?? this.soundVolume;

            this.setResolution(this.resolutionIndex);
            this.setGameSpeed(this.gameSpeedIndex);
            this.setKeyboardSpeed(this.keyboardSpeedIndex);
            this.setScrollSpeed(this.scrollSpeedIndex);
            this.setDragSpeed(this.dragSpeedIndex);
            this.changeInvertDrag(this.invertDrag);
        }
    }


}

