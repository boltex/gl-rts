<?xml version="1.0" encoding="utf-8"?>
<!-- Created by Leo: https://leo-editor.github.io/leo-editor/leo_toc.html -->
<leo_file xmlns:leo="https://leo-editor.github.io/leo-editor/namespaces/leo-python-editor/1.1" >
<leo_header file_format="2"/>
<globals/>
<preferences/>
<find_panel_settings/>
<vnodes>
<v t="felix.20241217200720.1"><vh>introduction</vh></v>
<v t="felix.20241217201352.1"><vh>@clean src/main.ts</vh>
<v t="felix.20241217225754.1"><vh>shaders</vh></v>
<v t="felix.20241217225604.1"><vh>loadImage</vh></v>
<v t="felix.20241217225540.1"><vh>Asynchronous IIFE</vh>
<v t="felix.20241217230346.1"><vh>Startup</vh></v>
</v>
<v t="felix.20241217230454.1"><vh>class Game</vh>
<v t="felix.20241217230518.1"><vh>resize</vh></v>
<v t="felix.20241217230522.1"><vh>update</vh></v>
</v>
</v>
</vnodes>
<tnodes>
<t tx="felix.20241217200720.1">WebGL RTS game

</t>
<t tx="felix.20241217201352.1">@others

</t>
<t tx="felix.20241217225540.1">(async () =&gt; {

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

    @others


})();

</t>
<t tx="felix.20241217225604.1">function loadImage(src: string): Promise&lt;HTMLImageElement&gt; {
    return new Promise((resolve, reject) =&gt; {
        const image = new Image();
        image.onload = () =&gt; resolve(image);
        image.src = src;
    });
}
</t>
<t tx="felix.20241217225754.1">// VERTEX SHADER
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
</t>
<t tx="felix.20241217230346.1">document.addEventListener('DOMContentLoaded', (event) =&gt; {
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

window.addEventListener('resize', (event) =&gt; {
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

</t>
<t tx="felix.20241217230454.1">export class Game {

    @others

}

</t>
<t tx="felix.20241217230518.1">resize(w: number, h: number, noDebounce?: boolean): void {
    // if (noDebounce) {
    //     this.calculateResize(w, h);
    // } else {
    //     if (this._resizeTimer) {
    //         clearTimeout(this._resizeTimer);
    //     }
    //     this._resizeTimer = setTimeout(() =&gt; {
    //         this.calculateResize(w, h); // Debounced
    //     }, 100);
    // }
}

</t>
<t tx="felix.20241217230522.1">update(timestamp: number, skipRender?: boolean): void {
    // 
}

</t>
</tnodes>
</leo_file>
