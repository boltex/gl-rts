// VERTEX SHADER
const vertexShaderSource = /*glsl*/ `#version 300 es

layout(location=0) in vec4 aPosition;
layout(location=1) in vec2 aTexCoord;
layout(location=2) in vec3 aOffset;
layout(location=3) in float aScale;
layout(location=4) in vec2 aUV;

out vec2 vTexCoord;

void main()
{
    vTexCoord = vec2(aTexCoord * 0.015625) + aUV;
    gl_Position = vec4(aPosition.xyz * aScale + aOffset, 1.0);
}`;

// FRAGMENT SHADER
const fragmentShaderSource = /*glsl*/ `#version 300 es

precision mediump float;

uniform mediump sampler2D uSampler;

in vec2 vTexCoord;

out vec4 fragColor;

void main()
{
    fragColor = texture(uSampler, vTexCoord);
}`;
function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.src = src;
    });
}
(async () => {

    console.log('Hello World!');

    const canvas = document.querySelector('canvas')!;
    const gl = canvas.getContext('webgl2')!;

    const program = gl.createProgram()!;

    const vertexShader = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vertexShader, vertexShaderSource);
    gl.compileShader(vertexShader);
    gl.attachShader(program, vertexShader);

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fragmentShader, fragmentShaderSource);
    gl.compileShader(fragmentShader);
    gl.attachShader(program, fragmentShader);

    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.log(gl.getShaderInfoLog(vertexShader));
        console.log(gl.getShaderInfoLog(fragmentShader));
        console.log(gl.getProgramInfoLog(program));
    }

    gl.useProgram(program);

    // * Start Program *

    const image = await loadImage('images/alien.png');

    document.addEventListener('DOMContentLoaded', (event) => {
        if (!window.game) {
            window.game = new Game();
            window.game.resize(
                window.innerWidth,
                window.innerHeight,
                true // First resize not debounced.
            );
        } else {
            console.log('Game instance already started');
        }
    });

    window.addEventListener('resize', (event) => {
        if (window.game) {
            window.game.resize(
                window.innerWidth,
                window.innerHeight
            );
        }
    });

    function loop(timestamp: number): void {
        window.game.update(timestamp);
        requestAnimationFrame(loop);
    }



})();

export class Game {

    resize(w: number, h: number, noDebounce?: boolean): void {
        // if (noDebounce) {
        //     this.calculateResize(w, h);
        // } else {
        //     if (this._resizeTimer) {
        //         clearTimeout(this._resizeTimer);
        //     }
        //     this._resizeTimer = setTimeout(() => {
        //         this.calculateResize(w, h); // Debounced
        //     }, 100);
        // }
    }

    update(timestamp: number, skipRender?: boolean): void {
        // 
    }


}


