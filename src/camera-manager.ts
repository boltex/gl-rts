import { CONFIG } from './config';
import { Game } from './game';

export class CameraManager {
    resolution: { label: string; width: number; height: number };
    aspectRatio: number;
    gameScreenWidth: number;
    gameScreenHeight: number;
    scrollEdgeX: number;
    scrollEdgeY: number;
    zoomLevel: number;
    gameWidthRatio: number;
    gameHeightRatio: number;
    initRangeX: number;
    initRangeY: number;
    game: Game;

    scrollX = 0;
    scrollY = 0;
    maxScrollX: number;
    maxScrollY: number;
    readonly maxMapX = (CONFIG.GAME.MAP.WIDTH * CONFIG.GAME.TILE.SIZE) - 1;
    readonly maxMapY = (CONFIG.GAME.MAP.HEIGHT * CONFIG.GAME.TILE.SIZE) - 1;

    constructor(game: Game) {
        this.game = game;
        this.resolution = CONFIG.DISPLAY.RESOLUTIONS[0];
        this.zoomLevel = 1;
        this.aspectRatio = this.resolution.width / this.resolution.height;
        this.gameScreenWidth = this.resolution.width / this.zoomLevel;
        this.gameScreenHeight = this.resolution.height / this.zoomLevel;
        this.initRangeX = (this.gameScreenWidth / CONFIG.GAME.TILE.SIZE) + 1;
        this.initRangeY = (this.gameScreenHeight / CONFIG.GAME.TILE.SIZE) + 1;
        this.scrollEdgeX = 0;
        this.scrollEdgeY = 0;
        this.gameWidthRatio = 0;
        this.gameHeightRatio = 0;
        this.maxScrollX = 0;
        this.maxScrollY = 0;
    }

    scroll(scrollVelocity: { x: number, y: number }): void {
        this.scrollX += scrollVelocity.x;
        this.scrollY += scrollVelocity.y;
        if (this.scrollX < 0) { this.scrollX = 0 };
        if (this.scrollY < 0) { this.scrollY = 0 };
        if (this.scrollX > this.maxScrollX) { this.scrollX = this.maxScrollX };
        if (this.scrollY > this.maxScrollY) { this.scrollY = this.maxScrollY };
    }

    setResolution(resolution: { label: string; width: number; height: number }): void {
        this.resolution = resolution;
        this.aspectRatio = this.resolution.width / this.resolution.height;
    }

    updateProperties(canvasBoundingRect: DOMRect): void {
        // Called when the mouse-wheel zoomed in or out, or when the game is started.
        this.gameScreenWidth = this.resolution.width / this.zoomLevel;
        this.gameScreenHeight = this.resolution.height / this.zoomLevel;
        this.scrollEdgeX = this.gameScreenWidth - CONFIG.DISPLAY.SCROLL.BORDER;
        this.scrollEdgeY = this.gameScreenHeight - CONFIG.DISPLAY.SCROLL.BORDER;
        this.initRangeX = (this.gameScreenWidth / CONFIG.GAME.TILE.SIZE) + 1;
        this.initRangeY = (this.gameScreenHeight / CONFIG.GAME.TILE.SIZE) + 1;
        this.maxScrollX = 1 + this.maxMapX - this.gameScreenWidth;
        this.maxScrollY = 1 + this.maxMapY - this.gameScreenHeight;
        this.gameWidthRatio = this.gameScreenWidth / canvasBoundingRect.width;
        this.gameHeightRatio = this.gameScreenHeight / canvasBoundingRect.height;
    }

    setZoom(zoomLevel: number): void {
        this.zoomLevel = zoomLevel;
        this.updateProperties(this.game.canvasBoundingRect);
        this.game.rendererManager.setUboWorldTransforms(this.gameScreenWidth, this.gameScreenHeight);
    }

    zoomIn() {
        const factor = 1.1;
        if (this.zoomLevel * factor <= 2) {
            this.zoomLevel *= factor;
        }
        this.updateProperties(this.game.canvasBoundingRect);
        this.game.rendererManager.setUboWorldTransforms(this.gameScreenWidth, this.gameScreenHeight);
    }

    zoomOut() {
        const factor = 1.1;
        if (this.zoomLevel / factor >= 0.5) {
            this.zoomLevel /= factor;
        }
        this.updateProperties(this.game.canvasBoundingRect);
        this.game.rendererManager.setUboWorldTransforms(this.gameScreenWidth, this.gameScreenHeight);
    }


}
