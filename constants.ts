
export const GAME_VERSION = 'v0.9.2';
export const GRID_WIDTH = 80;
export const GRID_HEIGHT = 43;
export const TILE_SIZE = 16;
export const INITIAL_COLONIST_COUNT = 3;
export const GAME_TICK_MS = 100;
export const MINING_DURATION = 15;
export const CHOPPING_DURATION = 12;
export const BUILD_DURATION = 20;
export const MAX_ENERGY = 1000;
export const LOW_ENERGY_THRESHOLD = 250;
export const MAX_HAPPINESS = 100;
export const HAPPINESS_DECAY_RATE = 0.05;
export const HAPPINESS_BOOST_ON_STORE = 2;
export const LOW_MORALE_THRESHOLD = 30;
export const INITIAL_GOAL = 50;
export const GOAL_INCREMENT = 50;
export const DAY_LENGTH_TICKS = 1000;
export const HOURS_PER_DAY = 24;
export const TICKS_PER_HOUR = Math.round(DAY_LENGTH_TICKS / HOURS_PER_DAY);
export const WALL_COST = 1;
export const DOOR_COST = 1;
export const FLOOR_COST = 0; // Not used but good for consistency
export const BED_COST = 3;
export const STORAGE_COST = 2;
export const TREE_REGROWTH_CHANCE = 0.0001;
export const SAPLING_TO_TREE_TICKS = 2000;
export const DAILY_EVENT_CHANCE = 0.4;
export const COLONIST_PATIENCE = 5;

export const PALETTE = {
    BACKGROUND: '#1a1a2e', NIGHT: '#11141f', ROCK: '#6b7280', MINERAL: '#facc15', GEM: '#9333ea', COLONIST: '#ffffff',
    COLONIST_SELECTED: '#67e8f9', STORAGE: '#3b82f6', DROPPED_MINERAL: '#fde047', DROPPED_GEM: '#c084fc',
    BED: '#be123c', FLOOR: '#4a5568', DESIGNATION_MINE: 'rgba(255, 100, 100, 0.4)',
    DESIGNATION_BUILD: 'rgba(100, 255, 100, 0.4)', TREE: '#22c55e', DROPPED_LOG: '#854d0e', WALL: '#a1a1aa', DOOR: '#f59e0b', SAPLING: '#65a30d'
};

export const CHARS = {
    ROCK: '#', MINERAL: '*', GEM: '♦', COLONIST: '@', COLONIST_WORKING: 'X', COLONIST_HAULING: 'o',
    COLONIST_RESTING: 'z', DROPPED_MINERAL: '.', DROPPED_GEM: '◦', STORAGE: 'S', BED: 'b', FLOOR: '·',
    TREE: 'T', WALL: '■', DROPPED_LOG: '=', DOOR: '+', SAPLING: ',',
};

export const COLONIST_LOG_COLORS = [ "bg-cyan-400","bg-green-400","bg-pink-400", "bg-yellow-300","bg-purple-400","bg-red-400","bg-blue-400","bg-orange-400" ];

export const PICKAXE_CURSOR_SVG = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJtMyAzIDggOC03IDcgNS01IDgtOCIvPjxwYXRoIGQ9Im0xNCAxMCA0LTIgMi00LTYgNCIvPjwvc3ZnPg==";
