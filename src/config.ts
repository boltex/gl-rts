const DISPLAY = {
    RESOLUTIONS: [
        {
            label: "16:9 (1920x1080)",
            width: 1920,
            height: 1080
        },
        {
            label: "16:10 (1920x1200)",
            width: 1920,
            height: 1200
        },
        {
            label: "4:3 (1440x1080)",
            width: 1440,
            height: 1080
        },
    ],
    SCROLL: {
        SPEED: 50, // speed in pixels for scrolling
        BORDER: 10 // pixels from screen to trigger scrolling
    }
} as const;

const GAME = {
    ACTIONS: {
        DEFAULT: 1,
        RELEASESEL: 2
    },
    TILE: {
        SIZE: 128, // size of an individual square TILE 
        DEPTH: 64, // Total number of tiles in the bitmap
    },
    WIDGETS: {
        SIZE: 64, // size of an individual square TILE 
        DEPTH: 10, // Total number of tiles in the bitmap
        MAX: 100 // Maximum number of widgets
    },
    RECTANGLES: {
        MAX: 256 // Maximum number of rectangles
    },
    SPRITES: {
        BITMAP_SIZE: 4096, // size of the square bitmap of alien sprites
        SIZE: 64, // size of an individual square alien sprite 
    },
    MAP: {
        WIDTH: 64, // game map width in TILES 
        HEIGHT: 64 // game map height in TILES 
    },
    TIMING: {
        TICK_RATE: 8, // 8 fps for game logic
        ANIM_RATE: 15, // 15 fps for animations
        FPS_UPDATE_INTERVAL: 1000 // Update FPS display every second
        // todo: use those values for inspiration or modifications
        /*
            Slowest: 1000ms/s ÷ 167ms/frame = 5.99 FPS
            Slower: 1000ms/s ÷ 111ms/frame = 9.01 FPS
            Slow: 1000ms/s ÷ 83ms/frame = 12.05 FPS
            Normal: 1000ms/s ÷ 67ms/frame = 14.93 FPS
            Fast: 1000ms/s ÷ 56ms/frame = 17.86 FPS
            Faster: 1000ms/s ÷ 48ms/frame = 20.83 FPS
            Fastest: 1000ms/s ÷ 42ms/frame = 23.81 FPS
        */
    },
    ENTITY: {
        INITIAL_POOL_SIZE: 100
    },
    ANIMATIONS: {
        TOTAL: 64
    }
} as const;

const CAMERA = {
    ZOOM: {
        MIN: 0.5,
        MAX: 2.0,
        STEPS: 4, // Steps to double zoom
        FACTOR: Math.pow(2, 1 / 4)
    }
} as const;

const UI = {
    MAP_EDITOR: {
        WIDTH: 130,
        HEIGHT: 280,
        TOP: 10,
        RIGHT: 10,
    },
    WIDGET: {
        ANIMATION_FRAMES: 6
    }
} as const;

const TEXTURE_MODEL_DATA = new Float32Array([
    // XY Coords, UV Offset 
    1, 0, 1, 0,
    0, 1, 0, 1,
    1, 1, 1, 1,
    1, 0, 1, 0,
    0, 0, 0, 0,
    0, 1, 0, 1,
]);

const RECTANGLE_MODEL_DATA = new Float32Array([
    // XY Coords
    1, 0,
    0, 1,
    1, 1,
    1, 0,
    0, 0,
    0, 1,
]);

// Export all configs from a single point
export const CONFIG = {
    TEXTURE_MODEL_DATA,
    RECTANGLE_MODEL_DATA,
    DISPLAY,
    GAME,
    CAMERA,
    UI
} as const;

