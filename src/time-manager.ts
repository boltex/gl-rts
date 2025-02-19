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

    constructor() {
        // tickRate: number, animRate: number, fpsInterval: number
        this.timePerTick = CONFIG.GAME.TIMING.GAME_SPEEDS[CONFIG.GAME.TIMING.DEFAULT_SPEED].value;
        this.timePerAnim = CONFIG.GAME.TIMING.CONSTANT_TIME_PER_ANIM;
        this.fpsInterval = CONFIG.GAME.TIMING.FPS_UPDATE_INTERVAL;
        this.timerTriggerAccum = this.timePerTick * 3; // 3 ticks behind
    }

    setGameSpeed(speed: number): void {
        this.timePerTick = speed;
        this.timerTriggerAccum = this.timePerTick * 3; // 3 ticks behind
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
        this.fps = Math.round(1000 / deltaTime);
        if (timestamp - this.fpsLastTime > this.fpsInterval) {
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

