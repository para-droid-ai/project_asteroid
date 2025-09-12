

export const GAME_VERSION = 'v0.10.2-alpha';
export const GRID_WIDTH = 94;
export const GRID_HEIGHT = 56;
export const TILE_SIZE = 16;
export const INITIAL_COLONIST_COUNT = 3;
export const GAME_TICK_MS = 100;
export const MINING_DURATION = 15;
export const CHOPPING_DURATION = 12;
export const BUILD_DURATION = 20;
export const MAX_ENERGY = 1000;
export const LOW_ENERGY_THRESHOLD = 250;
export const MAX_HAPPINESS = 100;
export const HAPPINESS_DECAY_rate = 0.05;
export const HAPPINESS_BOOST_ON_STORE = 2;
export const LOW_MORALE_THRESHOLD = 30;
export const INITIAL_GOAL = 25;
export const GOAL_INCREMENT = 50;
export const DAY_LENGTH_TICKS = 1000;
export const HOURS_PER_DAY = 24;
export const TICKS_PER_HOUR = Math.round(DAY_LENGTH_TICKS / HOURS_PER_DAY);
export const WALL_COST = 1; // Logs
export const DOOR_COST = 1; // Logs
export const FLOOR_COST = 1; // Logs
export const BED_COST = 3; // Logs
export const STORAGE_COST = 2; // Logs
export const HYDROPONICS_COST = { logs: 2, stone: 2, minerals: 1 };
export const ARCADE_COST = { logs: 4, stone: 4, minerals: 6, gems: 2 };
export const STONE_WALL_COST = 1; // Stone
export const STONE_FLOOR_COST = 1; // Stone
export const PLANTING_DURATION = 10;
export const HARVESTING_DURATION = 8;
export const CROP_GROWTH_DURATION = 800;
export const FOOD_YIELD_PER_HARVEST = 5;
export const TREE_REGROWTH_CHANCE = 0.0001;
export const SAPLING_TO_TREE_TICKS = 2000;
export const DAILY_EVENT_CHANCE = 0.4;
export const COLONIST_PATIENCE = 5;
export const MAX_HUNGER = 1000;
export const HUNGER_INCREASE_RATE = 0.5;
export const LOW_HUNGER_THRESHOLD = 300;
export const URGENT_HUNGER_THRESHOLD = 800;
export const FOOD_NUTRITION = 500;
export const MAX_BOREDOM = 1000;
export const BOREDOM_INCREASE_RATE = 0.4;
export const HIGH_BOREDOM_THRESHOLD = 700;
export const FUN_RECOVERY_RATE = 15;
export const AUTO_UNSTUCK_SOFT_TICKS = 25;
export const AUTO_UNSTUCK_MEDIUM_TICKS = 35;
export const AUTO_UNSTUCK_HARD_TICKS = 40;
export const CRITICAL_ENERGY_THRESHOLD = 50;
export const CRITICAL_HUNGER_THRESHOLD = 950;
export const TICKS_TO_DEATH = 300; // 30 seconds
export const HAPPINESS_PENALTY_PER_DEATH = 20;
export const INITIAL_FOOD = 25;

export const PALETTE = {
    BACKGROUND: '#1a1a2e', NIGHT: '#11141f', ROCK: '#6b7280', MINERAL: '#facc15', GEM: '#9333ea', COLONIST: '#ffffff',
    COLONIST_SELECTED: '#67e8f9', STORAGE: '#3b82f6', DROPPED_MINERAL: '#fde047', DROPPED_GEM: '#c084fc',
    BED: '#be123c', 
    WOOD_FLOOR: '#785549',
    STONE_FLOOR: '#4a5568',
    DESIGNATION_MINE: 'rgba(255, 100, 100, 0.4)',
    DESIGNATION_BUILD: 'rgba(100, 255, 100, 0.4)', TREE: '#22c55e', DROPPED_LOG: '#854d0e', 
    WOOD_WALL: '#a16207',
    STONE_WALL: '#a1a1aa',
    DOOR: '#f59e0b', SAPLING: '#65a30d',
    HYDROPONICS: '#059669', ARCADE: '#db2777', DROPPED_FOOD: '#fca5a5', DROPPED_STONE: '#9ca3af',
    CRITICAL_NEED_FLASH: '#ef4444',
};

export const CHARS = {
    ROCK: '#', MINERAL: '*', GEM: '♦', COLONIST: '@', COLONIST_WORKING: 'X', COLONIST_HAULING: 'o',
    COLONIST_RESTING: 'z', COLONIST_EATING: 'E', COLONIST_PLAYING: 'P',
    DROPPED_MINERAL: '.', DROPPED_GEM: '◦', STORAGE: 'S', BED: 'b',
    WOOD_FLOOR: '·',
    STONE_FLOOR: '·',
    TREE: 'T',
    WOOD_WALL: '■',
    STONE_WALL: '▓',
    DROPPED_LOG: '=', DOOR: '+', SAPLING: ',',
    HYDROPONICS: 'h', ARCADE: 'A', DROPPED_FOOD: 'f', DROPPED_STONE: '~',
};

export const COLONIST_LOG_COLORS = [ "bg-cyan-400","bg-green-400","bg-pink-400", "bg-yellow-300","bg-purple-400","bg-red-400","bg-blue-400","bg-orange-400" ];

export const PICKAXE_CURSOR_SVG = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJtMyAzIDggOC03IDcgNS01IDgtOCIvPjxwYXRoIGQ9Im0xNCAxMCA0LTIgMi00LTYgNCIvPjwvc3ZnPg==";