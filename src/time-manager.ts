import { CONFIG } from './config';

export class TimeManager {

    // Ticking
    tickAccumulator = 0; //
    currentTick = 0;
    timePerTick: number;
    timerTriggerAccum: number;

    // Animations
    animAccumulator = 0;
    currentAnim = 0;
    timePerAnim: number;

    // FPS tracking
    lastTime = 0; // Initialized by the game at the start of a proper game loop.
    fps = 0;
    fpsInterval: number;
    fpsLastTime = 0;

    constructor(tickRate: number, animRate: number, fpsInterval: number) {
        this.timePerTick = 1000 / tickRate;
        this.timerTriggerAccum = this.timePerTick * 3;
        this.timePerAnim = 1000 / animRate;
        this.fpsInterval = fpsInterval;
    }

    update(timestamp: number) {
        // Check for the very first frame,
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;
        this.tickAccumulator += deltaTime;
        this.animAccumulator += deltaTime;
        return deltaTime;
    }

    shouldAnimUpdate() {
        if (this.animAccumulator >= this.timePerAnim) {
            this.animAccumulator -= this.timePerAnim;
            this.currentAnim++;
            return true;
        }
        return false;
    }

    shouldTickUpdate() {
        if (this.tickAccumulator >= this.timePerTick) {
            this.tickAccumulator -= this.timePerTick;
            this.currentTick++;
            return true;
        }
        return false;
    }

    updateFps(timestamp: number, deltaTime: number) {
        if (timestamp - this.fpsLastTime > this.fpsInterval) {
            this.fps = Math.round(1000 / deltaTime);
            this.fpsLastTime = timestamp;
            // console.log('RAF FPS ', this.fps);
        }
    }

    getInterpolation(): number {
        return this.tickAccumulator / this.timePerTick;
    }

    needCatchUp(timestamp: number): boolean {
        const deltaTime = timestamp - this.lastTime;
        if ((this.tickAccumulator + deltaTime) < this.timerTriggerAccum) {
            return false;
        }
        return true;
    }

}

