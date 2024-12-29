import { Point } from "./maths";
/**
 * Creates a WebGL program from vertex and fragment shader source code.
 * @param gl The WebGL rendering context.
 * @param vs The source code for the vertex shader.
 * @param fs The source code for the fragment shader.
 * @returns The created WebGL program.
 * @throws Will throw an error if the program or shaders cannot be created, compiled, or linked.
 */
export function createProgram(gl: WebGLRenderingContext, vs: string, fs: string): WebGLProgram {
    const program = gl.createProgram();
    if (!program) {
        throw new Error('Unable to create WebGL program.');
    }

    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    if (!vertexShader) {
        throw new Error('Unable to create vertex shader.');
    }
    gl.shaderSource(vertexShader, vs);
    gl.compileShader(vertexShader);
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
        const error = gl.getShaderInfoLog(vertexShader);
        gl.deleteShader(vertexShader);
        throw new Error('Vertex shader compilation error: ' + error);
    }
    gl.attachShader(program, vertexShader);

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    if (!fragmentShader) {
        throw new Error('Unable to create fragment shader.');
    }
    gl.shaderSource(fragmentShader, fs);
    gl.compileShader(fragmentShader);
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
        const error = gl.getShaderInfoLog(fragmentShader);
        gl.deleteShader(fragmentShader);
        throw new Error('Fragment shader compilation error: ' + error);
    }
    gl.attachShader(program, fragmentShader);

    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const error = gl.getProgramInfoLog(program);
        gl.deleteProgram(program);
        throw new Error('Program linking error: ' + error);
    }

    return program;
}

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

export function interpolate(min: Point, max: Point, fract: number): Point {
    return new Point(max.x + (min.x - max.x) * fract, max.y + (min.y - max.y) * fract);
}

export function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.src = src;
    });
}


