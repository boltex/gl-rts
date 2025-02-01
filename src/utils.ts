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

