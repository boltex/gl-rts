const DISPLAY = {
    DEFAULT_RESOLUTION: 0, // index for RESOLUTIONS
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
    FONT: {
        SIZE: 32, // size of an individual square TILE 
        DEPTH: 95, // Total number of tiles in the bitmap
        MAX: 256 // Maximum number of characters
    },
    WIDGETS: {
        SIZE: 128, // size of an individual square TILE 
        DEPTH: 5, // Total number of tiles in the bitmap
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
        DEFAULT_SPEED: 3, // index for GAME_SPEEDS
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
        BORDER: 12, // pixels from screen to trigger scrolling
        DEFAULT_KEYBOARD_SPEED: 3, // speed index for KEYBOARD_SPEEDS
        KEYBOARD_SPEEDS: [
            // Keyboard scroll speed in game-pixels for moving the map with arrow keys
            { label: "Slowest", value: 25 }, // 0 
            { label: "Slower", value: 45 }, // 1
            { label: "Slow", value: 65 }, // 2
            { label: "Normal", value: 85 }, // 3
            { label: "Fast", value: 115 }, // 4
            { label: "Faster", value: 145 }, // 5
            { label: "Fastest", value: 175 }, // 6  
        ],
        DEFAULT_SCROLL_SPEED: 3, // speed index for SCROLL_SPEEDS
        SCROLL_SPEEDS: [
            // Mouse scroll speed in game-pixels for being near the edge of the screen
            { label: "Slowest", value: 25 }, // 0 
            { label: "Slower", value: 45 }, // 1
            { label: "Slow", value: 65 }, // 2
            { label: "Normal", value: 85 }, // 3
            { label: "Fast", value: 115 }, // 4
            { label: "Faster", value: 145 }, // 5
            { label: "Fastest", value: 175 }, // 6   
        ],
        DEFAULT_DRAG_INVERT: false,
        DEFAULT_DRAG_SPEED: 3, // speed index for DRAG_SPEEDS
        DRAG_SPEEDS: [
            // Mouse drag speed multipliers for moving the map with middle mouse button
            { label: "Slowest", value: 1 }, // 0 
            { label: "Slower", value: 2 }, // 1
            { label: "Slow", value: 4 }, // 2
            { label: "Normal", value: 8 }, // 3
            { label: "Fast", value: 16 }, // 4
            { label: "Faster", value: 32 }, // 5
            { label: "Fastest", value: 64 }, // 6  
        ]
    }
} as const;

const AUDIO = {
    DEFAULT_MUSIC_ENABLED: true,
    DEFAULT_SOUND_ENABLED: true,
    DEFAULT_MUSIC_VOLUME: 50,
    DEFAULT_SOUND_VOLUME: 50,
}

const UI = {
    MINIMAP_RATIO: 3.75,
    WIDGET: {
        TOTAL_FRAMES: 6,
        ANIMATION_FRAMES: [0, 2, 4, 3, 2, 1] // Widget animation has 6 frames
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

const SHORTCUT_KEYS = [
    {
        key: "F1",
        action: "Help menu"
    },
    {
        key: "F6",
        action: "Reset zoom"
    },
    {
        key: "F10",
        action: "Options menu"
    },
    {
        key: "Ctrl+Alt+F",
        action: "Toggle FPS display"
    },
    {
        key: "Ctrl+M",
        action: "Toggle music"
    },
    {
        key: "Ctrl+S",
        action: "Toggle sound"
    },
    {
        key: "Tab",
        action: "Toggle minimap terrain"
    },
    {
        key: "+ or -",
        action: "Change game speed"
    }
] as const;

const EDITOR_KEYS = [
    {
        key: "F9",
        action: "Toggle editor-mode"
    },
    {
        key: "+ or -",
        action: "Change map tile"
    },
    {
        key: "Spacebar",
        action: "Play / Pause animation"
    },
    {
        key: "A or D",
        action: "Change orientation"
    },
    {
        key: "← or →",
        action: "Change selected frame"
    },
    {
        key: "↑ or ↓",
        action: "Change current sprite"
    }
] as const;

const FONT_SIZES = [
    10,
    10.625,
    12.84375,
    23.28125,
    17.46875,
    31.25,
    21.5625,
    6.75,
    12.25,
    12.25,
    17.46875,
    23.28125,
    9.6875,
    11.625,
    9.6875,
    12.234375,
    17.46875,
    17.46875,
    17.46875,
    17.46875,
    17.46875,
    17.46875,
    17.46875,
    17.46875,
    17.46875,
    17.46875,
    11.3125,
    11.3125,
    23.28125,
    23.28125,
    23.28125,
    15.15625,
    29.09375,
    19.1875,
    18.859375,
    19.21875,
    21.703125,
    17.953125,
    16.6875,
    21.359375,
    21.609375,
    11.9375,
    13.328125,
    18.8125,
    15.921875,
    24.65625,
    21.359375,
    22.640625,
    17.640625,
    22.640625,
    19.859375,
    17.828125,
    18.6875,
    20.984375,
    19.09375,
    28.859375,
    18.578125,
    18.4375,
    17.890625,
    12.25,
    12.234375,
    12.25,
    23.28125,
    17.46875,
    17.46875,
    16.796875,
    17.6875,
    14.765625,
    17.6875,
    16.84375,
    10.1875,
    17.6875,
    17.84375,
    7.3125,
    9.015625,
    15.9375,
    7.3125,
    26.875,
    17.84375,
    17.375,
    17.6875,
    17.6875,
    11.53125,
    14.28125,
    10.703125,
    17.84375,
    15.9375,
    23.75,
    15.84375,
    15.9375,
    14.21875,
    15.375,
    12.234375,
    15.375,
    23.28125
] as const;

// Export all configs from a single point
export const CONFIG = {
    AUDIO,
    SHORTCUT_KEYS,
    EDITOR_KEYS,
    TEXTURE_MODEL_DATA,
    RECTANGLE_MODEL_DATA,
    DISPLAY,
    GAME,
    CAMERA,
    UI,
    FONT_SIZES
} as const;

