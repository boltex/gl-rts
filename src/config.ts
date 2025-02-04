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
        BITMAP_SIZE: 1024, // size of a square bitmap of tiles
        SIZE: 128, // size of an individual square TILE 
        DEPTH: 64, // Should be BITMAP_SIZE / SIZE
        TILERATIO: 8 // Should be BITMAP_SIZE / SIZE
    },
    MAP: {
        WIDTH: 32, // game map width in TILES 
        HEIGHT: 32 // game map height in TILES 
    },
    TIMING: {
        TICK_RATE: 8, // 8 fps for game logic
        ANIM_RATE: 15, // 15 fps for animations
        FPS_UPDATE_INTERVAL: 1000 // Update FPS display every second
    },
    ENTITY: {
        INITIAL_POOL_SIZE: 100
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
    GAME
} as const;
