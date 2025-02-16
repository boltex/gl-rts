const DISPLAY = {
    RESOLUTIONS: [
        {
            label: "16:9",
            width: 1920,
            height: 1080
        },
        {
            label: "16:10",
            width: 1920,
            height: 1200
        },
        {
            label: "4:3",
            width: 1440,
            height: 1080
        },
    ]
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
        FPS_UPDATE_INTERVAL: 1000, // Update FPS display every second
        CHECK_UPDATE_INTERVAL: 250, // For needed ticks to be computed if game is minimized
        // Cursor, Hud, and other animations
        CONSTANT_TIME_PER_ANIM: 67, // 1000ms/s ÷ 67ms/frame = 14.93 FPS
        DEFAULT_SPEED: 3,
        GAME_SPEEDS: [
            // Game logic timing (Variable in single player, fixed in multiplayer)
            { label: "Slowest", value: 167 }, // 0 
            { label: "Slower", value: 111 }, // 1
            { label: "Slow", value: 83 }, // 2
            { label: "Normal", value: 67 }, // 3
            { label: "Fast", value: 56 }, // 4
            { label: "Faster", value: 48 }, // 5
            { label: "Fastest", value: 42 }, // 6
        ],
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
    },
    SCROLL: {
        BORDER: 10, // pixels from screen to trigger scrolling
        SPEED: 50, // speed in pixels for scrolling
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

