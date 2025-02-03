import { Vec2 } from "./types";

/**
 * Tries to put browser into fullscreen mode.
 * @param element The element to put into fullscreen mode.
 * @returns A promise that resolves when the browser is in fullscreen mode.
 */
export function fullScreen(element: Element): Promise<void> {
    if (document.fullscreenElement !== null) {
        return Promise.resolve();  // already fullscreen
    }
    if (element.requestFullscreen) {
        const requestFullscreen = element.requestFullscreen || (element as any).webkitRequestFullscreen || (element as any).mozRequestFullScreen || (element as any).msRequestFullscreen;
        if (requestFullscreen) {
            return requestFullscreen.call(element).catch((err) => {
                console.error(
                    `Error attempting to enable fullscreen mode: ${err.message} (${err.name})`,
                );
            });
        } else {
            return Promise.resolve();
        }
    } else {
        return Promise.resolve();
    }
}

export function interpolate(min: Vec2, max: Vec2, fract: number): Vec2 {
    return { x: max.x + (min.x - max.x) * fract, y: max.y + (min.y - max.y) * fract };
}

export function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.src = src;
    });
}

export function getDisplaySize(entry: ResizeObserverEntry): { width: number, height: number } {
    let width: number, height: number;
    let dpr = window.devicePixelRatio;
    if (entry.devicePixelContentBoxSize) {
        // NOTE: Only this path gives the correct answer
        // The other 2 paths are an imperfect fallback
        // for browsers that don't provide anyway to do this
        [width, height] = [entry.devicePixelContentBoxSize[0].inlineSize, entry.devicePixelContentBoxSize[0].blockSize];
        dpr = 1; // Already in device pixels
    } else if (entry.contentBoxSize) {
        if (entry.contentBoxSize[0]) {
            [width, height] = [entry.contentBoxSize[0].inlineSize, entry.contentBoxSize[0].blockSize];
        } else {
            // @ts-expect-error legacy API
            [width, height] = [entry.contentBoxSize.inlineSize, entry.contentBoxSize.blockSize];
        }
    } else {
        // Legacy API
        [width, height] = [entry.contentRect.width, entry.contentRect.height];
    }
    return { width: Math.round(width * dpr), height: Math.round(height * dpr) };
}

export function debounce<T extends (...args: any[]) => void>(func: T, delay: number): T {
    let timer: number;
    return ((...args: any[]) => {
        if (timer) clearTimeout(timer);
        timer = window.setTimeout(() => func(...args), delay);
    }) as T;
}
