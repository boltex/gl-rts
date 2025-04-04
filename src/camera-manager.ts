import { CONFIG } from './config';
import { Game } from './game';

export class CameraManager {
    resolution: {
        label: string;
        width: number;
        height: number;
    };
    aspectRatio: number;
    gameScreenWidth: number;
    gameScreenHeight: number;
    scrollEdgeXMax: number;
    scrollEdgeYMax: number;
    scrollEdgeXMin: number;
    scrollEdgeYMin: number;
    zoom: number;
    zoomTarget: number; // Used for smooth zooming
    gameWidthRatio: number;
    gameHeightRatio: number;
    initRangeX: number;
    initRangeY: number;
    game: Game;

    scrollX = 0;
    scrollY = 0;
    maxScrollX: number;
    maxScrollY: number;
    zoomFactor = CONFIG.CAMERA.ZOOM.FACTOR;
    minZoom = CONFIG.CAMERA.ZOOM.MIN;
    maxZoom = CONFIG.CAMERA.ZOOM.MAX;
    readonly maxMapX = (CONFIG.GAME.MAP.WIDTH * CONFIG.GAME.TILE.SIZE) - 1;
    readonly maxMapY = (CONFIG.GAME.MAP.HEIGHT * CONFIG.GAME.TILE.SIZE) - 1;

    constructor(game: Game) {
        this.game = game;
        this.resolution = CONFIG.DISPLAY.RESOLUTIONS[CONFIG.DISPLAY.DEFAULT_RESOLUTION];
        this.zoom = 1;
        this.zoomTarget = 1;
        this.aspectRatio = this.resolution.width / this.resolution.height;
        this.gameScreenWidth = this.resolution.width / this.zoom;
        this.gameScreenHeight = this.resolution.height / this.zoom;
        this.initRangeX = (this.gameScreenWidth / CONFIG.GAME.TILE.SIZE) + 1;
        this.initRangeY = (this.gameScreenHeight / CONFIG.GAME.TILE.SIZE) + 1;
        this.scrollEdgeXMax = 0;
        this.scrollEdgeYMax = 0;
        this.scrollEdgeXMin = 0;
        this.scrollEdgeYMin = 0;
        this.gameWidthRatio = 0;
        this.gameHeightRatio = 0;
        this.maxScrollX = 0;
        this.maxScrollY = 0;
    }

    scroll(scrollVelocity?: { dx: number, dy: number }): boolean {
        if (scrollVelocity) {
            this.scrollX += scrollVelocity.dx;
            this.scrollY += scrollVelocity.dy;
        }
        let stop = false;
        if (this.scrollX < 0) { this.scrollX = 0; stop = true; };
        if (this.scrollY < 0) { this.scrollY = 0; stop = true; };
        if (this.scrollX > this.maxScrollX) { this.scrollX = this.maxScrollX; stop = true; };
        if (this.scrollY > this.maxScrollY) { this.scrollY = this.maxScrollY; stop = true; };
        return stop;
    }

    setResolution(resolution: {
        label: string;
        width: number;
        height: number;
    }): void {
        this.resolution = resolution;
        this.aspectRatio = this.resolution.width / this.resolution.height;
    }

    updateProperties(canvasBoundingRect: DOMRect): void {
        // Called when the mouse-wheel zoomed in or out, or when the game is started.
        const scrollZoneThickness = CONFIG.CAMERA.SCROLL.BORDER / this.zoom; // Divide by zoom to keep thickness constant
        this.gameScreenWidth = this.resolution.width / this.zoom;
        this.gameScreenHeight = this.resolution.height / this.zoom;
        this.scrollEdgeXMax = this.gameScreenWidth - scrollZoneThickness;
        this.scrollEdgeYMax = this.gameScreenHeight - scrollZoneThickness;
        this.scrollEdgeXMin = scrollZoneThickness;
        this.scrollEdgeYMin = scrollZoneThickness;
        this.initRangeX = (this.gameScreenWidth / CONFIG.GAME.TILE.SIZE) + 1;
        this.initRangeY = (this.gameScreenHeight / CONFIG.GAME.TILE.SIZE) + 1;
        this.maxScrollX = 1 + this.maxMapX - this.gameScreenWidth;
        this.maxScrollY = 1 + this.maxMapY - this.gameScreenHeight;
        this.gameWidthRatio = this.gameScreenWidth / canvasBoundingRect.width;
        this.gameHeightRatio = this.gameScreenHeight / canvasBoundingRect.height;
    }

    animateZoom(): void {
        if (this.zoom === this.zoomTarget) {
            return;
        }

        const oldZoom = this.zoom;
        let newZoom = oldZoom;

        if (newZoom < this.zoomTarget) {
            newZoom = oldZoom * this.zoomFactor; // Zoom in
        } else if (newZoom > this.zoomTarget) {
            newZoom = oldZoom / this.zoomFactor; // Zoom out
        }

        if (newZoom > this.maxZoom || newZoom < this.minZoom) {
            return;
        }
        const mouseX = this.game.inputManager.mouseX;
        const mouseY = this.game.inputManager.mouseY;

        // Adjust scroll so that the world coordinate under the mouse remains constant.
        this.scrollX = this.scrollX + (mouseX / oldZoom) - (mouseX / newZoom);
        this.scrollY = this.scrollY + (mouseY / oldZoom) - (mouseY / newZoom);

        this.zoom = newZoom;
        this.updateProperties(this.game.canvasBoundingRect); // Updates maxScrollX and maxScrollY
        this.scroll(); // scroll without parameter just limits to maxScroll.
        this.game.inputManager.setCursorPos(); // Update mouse and gameMouse coords
        this.game.rendererManager.setUboWorldTransforms(this.gameScreenWidth, this.gameScreenHeight); // update world coords
    }

    resetZoom(): void {
        this.zoomTarget = 1;
    }

    zoomIn() {
        const oldZoom = this.zoom;
        const newZoom = oldZoom * this.zoomFactor;
        if (newZoom > this.maxZoom) {
            return;
        }
        this.zoomTarget = newZoom;
    }

    zoomOut() {
        const oldZoom = this.zoom;
        const newZoom = oldZoom / this.zoomFactor;
        if (newZoom < this.minZoom) {
            return;
        }
        this.zoomTarget = newZoom;
    }


}
