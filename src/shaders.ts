
// BACKGROUND MAP VERTEX SHADER
const TILE_VERTEX_SHADER = /*glsl*/ `#version 300 es

// The next two are the repeated geometry and UV for each instance of the model
layout(location=0) in vec4 aPosition;
layout(location=1) in vec2 aTexCoord;

// Those next four use vertexAttribDivisor and are updated every instance
layout(location=2) in vec3 aOffset;
layout(location=3) in float aScale;
layout(location=4) in vec4 aColor;
layout(location=5) in float aDepth;

layout(std140) uniform World {
    float uWorldX;
    float uWorldY;
};

out vec4 vColor;
out vec2 vTexCoord;
out float vDepth;

void main()
{
    vColor = aColor;
    vTexCoord = aTexCoord;
    vDepth = aDepth;
    vec3 pos = aPosition.xyz * aScale + aOffset;
    // This brings it in the range 0-2. So it also needs a -1 to 1 conversion.
    // gl_Position = vec4((pos.x * uWorldX) - 1.0, (pos.y * uWorldY) + 1.0, pos.z, 1.0);
    gl_Position = vec4( vec3(aPosition.xyz + aOffset), 1.0);

}`;

// BACKGROUND MAP FRAGMENT SHADER
const TILE_FRAGMENT_SHADER = /*glsl*/ `#version 300 es

precision mediump float;

uniform mediump sampler2DArray uSampler;

in vec4 vColor;
in vec2 vTexCoord;
in float vDepth;
out vec4 fragColor;

void main()
{
    fragColor = vColor * texture(uSampler, vec3(vTexCoord, vDepth));
}`;

// ALIEN CREATURE SPRITE VERTEX SHADER
const SPRITE_VERTEX_SHADER = /*glsl*/ `#version 300 es

// The next two are the repeated geometry and UV for each instance of the model
layout(location=0) in vec4 aPosition;
layout(location=1) in vec2 aTexCoord;

// Those next four use vertexAttribDivisor and are updated every instance
layout(location=2) in vec3 aOffset;
layout(location=3) in float aScale;
layout(location=4) in vec4 aColor;
layout(location=5) in vec2 aUV;

layout(std140) uniform World {
    float uWorldX;
    float uWorldY;
};

out vec4 vColor;
out vec2 vTexCoord;

void main()
{
    vColor = aColor;
    vTexCoord = vec2(aTexCoord * 0.015625) + aUV;

    vec3 pos = aPosition.xyz * aScale + aOffset;

    // This brings it in the range 0-2. So it also needs a -1 to 1 conversion.
    gl_Position = vec4((pos.x * uWorldX) - 1.0, (pos.y * uWorldY) + 1.0, pos.z, 1.0);

}`;

// ALIEN CREATURE SPRITE FRAGMENT SHADER
const SPRITE_FRAGMENT_SHADER = /*glsl*/ `#version 300 es

precision mediump float;

uniform mediump sampler2D uSampler;

in vec4 vColor;
in vec2 vTexCoord;
out vec4 fragColor;

void main()
{
    fragColor = vColor * texture(uSampler, vTexCoord);
}`;

// SELECTION LINE VERTEX SHADER
const RECTANGLE_VERTEX_SHADER = /*glsl*/ `#version 300 es

// The next two are the repeated geometry and UV for each instance of the model
layout(location=0) in vec4 aPosition;

// Those next four use vertexAttribDivisor and are updated every instance
layout(location=1) in vec3 aOffset;
layout(location=2) in float aScaleX;
layout(location=3) in float aScaleY;
layout(location=4) in vec4 aColor;

layout(std140) uniform World {
    float uWorldX;
    float uWorldY;
};

out vec4 vColor;

void main()
{
    vColor = aColor;
    vec3 pos = aPosition.xyz * vec3(aScaleX, aScaleY, 1.0) + aOffset;
    
    // This brings it in the range 0-2. So it also needs a -1 to 1 conversion.
    gl_Position = vec4((pos.x * uWorldX) - 1.0, (pos.y * uWorldY) + 1.0, pos.z, 1.0);

}`;

// SELECTION LINE SPRITE FRAGMENT SHADER
const RECTANGLE_FRAGMENT_SHADER = /*glsl*/ `#version 300 es

precision mediump float;

in vec4 vColor;
out vec4 fragColor;

void main()
{
    fragColor = vColor;
}`;

// Export all configs from a single point
export const SHADERS = {
    TILE_VERTEX_SHADER,
    TILE_FRAGMENT_SHADER,
    SPRITE_VERTEX_SHADER,
    SPRITE_FRAGMENT_SHADER,
    RECTANGLE_VERTEX_SHADER,
    RECTANGLE_FRAGMENT_SHADER,
} as const;
