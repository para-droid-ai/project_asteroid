
import { GameState, Colonist, DesignationType, Grid, Designations, Point, GameEvent, TileType, ColonistRole, GameLogItem, PriorityTask } from './types';
import * as C from './constants';
import { distance } from './utils/geometry';
import { findPath } from './utils/pathfinding';
import { createNoise2D, createPRNG } from './utils/noise';

export const initialState: GameState = {
    grid: [],
    designations: [],
    colonists: [],
    storedMinerals: 0,
    storedGems: 0,
    storedLogs: 15,
    storedStone: 0,
    storedFood: C.INITIAL_FOOD,
    milestoneLevel: 0,
    currentGoal: C.INITIAL_GOAL,
    activeEvents: [],
    gameLog: [],
    tickCount: 0,
    currentDay: 1,
    currentHour: 6,
    seed: Date.now().toString().slice(-4),
    colonyName: "",
    asteroidName: "",
    chronology: [],
    colonistLogs: [],
    priorityTasks: [],
    simulationSettings: { allowNewColonists: true },
    colonyStats: { softResets: 0, hardResets: 0 },
    averageHappiness: 100,
    apiFailed: false,
    version: C.GAME_VERSION,
};

export enum ActionType {
    TICK,
    RESET_GAME,
    SET_SEED,
    ADD_LOG,
    ADD_CHRONOLOGY,
    SET_API_FAILED,
    ADD_COLONIST,
    TRIGGER_ACCIDENT,
    TRIGGER_METEOR_SHOWER,
    ADD_EVENT,
    SET_DESIGNATION,
    REORDER_PRIORITY_TASKS,
    UPDATE_SIMULATION_SETTINGS,
    UPDATE_COLONIST_ROLES,
    SOFT_RESET_COLONISTS,
    HARD_RESET_COLONISTS,
    LOAD_GAME,
}

export type Action =
    | { type: ActionType.TICK }
    | { type: ActionType.RESET_GAME; payload: { seed: string; storyData: any } }
    | { type: ActionType.SET_SEED; payload: string }
    | { type: ActionType.ADD_LOG; payload: { message: string; type: 'standard' | 'event' } }
    | { type: ActionType.ADD_CHRONOLOGY; payload: string }
    | { type: ActionType.SET_API_FAILED; payload: boolean }
    | { type: ActionType.ADD_COLONIST; payload: { name: string; backstory: string } }
    | { type: ActionType.TRIGGER_ACCIDENT }
    | { type: ActionType.TRIGGER_METEOR_SHOWER }
    | { type: ActionType.ADD_EVENT; payload: GameEvent }
    | { type: ActionType.SET_DESIGNATION; payload: { start: Point; end: Point; type: DesignationType, dragStartDesignations?: Designations } }
    | { type: ActionType.REORDER_PRIORITY_TASKS; payload: any[] }
    | { type: ActionType.UPDATE_SIMULATION_SETTINGS; payload: any }
    | { type: ActionType.UPDATE_COLONIST_ROLES; payload: { id: string; roles: ColonistRole[] } }
    | { type: ActionType.SOFT_RESET_COLONISTS }
    | { type: ActionType.HARD_RESET_COLONISTS }
    | { type: ActionType.LOAD_GAME; payload: GameState };
    
const recordColonistWorkLog = (logs: any[], updatedColonists: Colonist[], tickNum: number) => {
    const newLogs = Array.from({ length: updatedColonists.length }, (_, i) => logs[i] || Array(C.DAY_LENGTH_TICKS).fill(null));
    updatedColonists.forEach((colonist, idx) => {
        const activityEntry = { task: colonist.task, carrying: colonist.carrying };
        if (newLogs[idx]) {
            newLogs[idx][tickNum % newLogs[idx].length] = activityEntry;
        }
    });
    return newLogs;
};

const formatTypeName = (type: DesignationType) => {
    return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
};

const isTileDesignatable = (tileType: TileType, designationType: DesignationType): boolean => {
    switch (designationType) {
        case DesignationType.MINE: return [TileType.ROCK, TileType.MINERAL, TileType.GEM].includes(tileType);
        case DesignationType.CHOP: return tileType === TileType.TREE;
        case DesignationType.HARVEST: return [TileType.ROCK, TileType.MINERAL, TileType.GEM, TileType.TREE].includes(tileType);
        case DesignationType.BUILD_WOOD_FLOOR:
        case DesignationType.BUILD_WOOD_WALL:
        case DesignationType.BUILD_DOOR:
        case DesignationType.BUILD_BED:
        case DesignationType.BUILD_STORAGE:
        case DesignationType.BUILD_HYDROPONICS:
        case DesignationType.BUILD_ARCADE:
        case DesignationType.BUILD_STONE_FLOOR:
        case DesignationType.BUILD_STONE_WALL:
            return [TileType.EMPTY, TileType.WOOD_FLOOR, TileType.STONE_FLOOR].includes(tileType);
        case DesignationType.UPGRADE_TO_STONE_FLOOR: return tileType === TileType.WOOD_FLOOR;
        case DesignationType.UPGRADE_TO_STONE_WALL: return tileType === TileType.WOOD_WALL;
        default: return false;
    }
};

const generateProceduralGrid = (currentSeed: string): Grid => {
    const prng = createPRNG(currentSeed);
    const noise2D = createNoise2D(prng); const mineralNoise2D = createNoise2D(prng); const gemNoise2D = createNoise2D(prng); const treeNoise2D = createNoise2D(prng);
    let newGrid: Grid = Array.from({ length: C.GRID_HEIGHT }, (_, y) => Array(C.GRID_WIDTH).fill(null).map((__, x) => ({ x, y, type: TileType.EMPTY, regrowthTicks: 0 })));
    
    for (let y = 0; y < C.GRID_HEIGHT; y++) for (let x = 0; x < C.GRID_WIDTH; x++) { if (noise2D(x / 20, y / 20) > -0.2) newGrid[y][x].type = TileType.ROCK; }
    
    for (let i = 0; i < 4; i++) {
        let tempGrid: Grid = newGrid.map(row => row.map(cell => ({ ...cell })));
        for (let y = 1; y < C.GRID_HEIGHT - 1; y++) for (let x = 1; x < C.GRID_WIDTH - 1; x++) {
            let wallCount = 0;
            for (let ny = y - 1; ny <= y + 1; ny++) for (let nx = x - 1; nx <= x + 1; nx++) { if (ny === y && nx === x) continue; if (newGrid[ny]?.[nx]?.type === TileType.ROCK) wallCount++; }
            if (wallCount > 4) tempGrid[y][x].type = TileType.ROCK; else if (wallCount < 4) tempGrid[y][x].type = TileType.EMPTY;
        }
        newGrid = tempGrid;
    }

    const startX = Math.floor(C.GRID_WIDTH / 2), startY = Math.floor(C.GRID_HEIGHT / 2);
    for (let y = startY - 6; y <= startY + 6; y++) for (let x = startX - 9; x <= startX + 9; x++) {
        if (y >= 0 && y < C.GRID_HEIGHT && x >= 0 && x < C.GRID_WIDTH) newGrid[y][x] = { ...newGrid[y][x], type: TileType.EMPTY, regrowthTicks: 0 };
    }
    
    const shelterRect = { x0: startX - 4, y0: startY, x1: startX + 4, y1: startY + 5 };
    for(let y = shelterRect.y0; y <= shelterRect.y1; y++) {
        for(let x = shelterRect.x0; x <= shelterRect.x1; x++) {
             if(newGrid[y]?.[x]) newGrid[y][x].type = TileType.WOOD_FLOOR;
        }
    }

    for (let y = 0; y < C.GRID_HEIGHT; y++) for (let x = 0; x < C.GRID_WIDTH; x++) {
        if (newGrid[y][x].type === TileType.ROCK) {
            if (mineralNoise2D(x / 10, y / 10) > 0.4) newGrid[y][x].type = TileType.MINERAL;
            else if (gemNoise2D(x / 8, y / 8) > 0.8) newGrid[y][x].type = TileType.GEM;
        } else if (newGrid[y][x].type === TileType.EMPTY) {
            const inClearZone = (y > startY - 7 && y < startY + 7 && x > startX - 10 && x < startX + 10);
            if (treeNoise2D(x / 15, y / 15) > 0.5 && !inClearZone) newGrid[y][x].type = TileType.TREE;
        }
    }

    for (let i = 0; i < 5; i++) { if(newGrid[startY+2]?.[startX-2+i]) newGrid[startY + 2][startX - 2 + i].type = TileType.STORAGE; if(newGrid[startY+4]?.[startX-2+i]) newGrid[startY + 4][startX - 2 + i].type = TileType.BED; }
    
    return newGrid;
};

const derivePriorityTasks = (designations: Designations, existingTasks: PriorityTask[]): PriorityTask[] => {
    const newTasksFromDesignations: PriorityTask[] = [];
    if (designations) {
        for (let y = 0; y < C.GRID_HEIGHT; y++) {
            for (let x = 0; x < C.GRID_WIDTH; x++) {
                const des = designations[y]?.[x];
                if (des) {
                    newTasksFromDesignations.push({ id: `${x}-${y}`, type: des, x, y });
                }
            }
        }
    }
    const currentDesignationIds = new Set(newTasksFromDesignations.map(t => t.id));
    const preservedTasks = existingTasks.filter(pt => currentDesignationIds.has(pt.id));
    const preservedTaskIds = new Set(preservedTasks.map(t => t.id));
    const addedTasks = newTasksFromDesignations.filter(nt => !preservedTaskIds.has(nt.id));

    return [...preservedTasks, ...addedTasks];
};

const dropCarriedItem = (pawn: Colonist, grid: Grid): boolean => {
    if (pawn.carrying && grid[pawn.y]?.[pawn.x] && [TileType.EMPTY, TileType.WOOD_FLOOR, TileType.STONE_FLOOR].includes(grid[pawn.y][pawn.x].type)) {
        let dropType: TileType | null = null;
        if (pawn.carrying === TileType.MINERAL) dropType = TileType.DROPPED_MINERAL;
        else if (pawn.carrying === TileType.GEM) dropType = TileType.DROPPED_GEM;
        else if (pawn.carrying === 'LOGS') dropType = TileType.DROPPED_LOG;
        else if (pawn.carrying === 'FOOD') dropType = TileType.DROPPED_FOOD;
        else if (pawn.carrying === 'STONE') dropType = TileType.DROPPED_STONE;
        if (dropType) {
            grid[pawn.y][pawn.x].type = dropType;
            return true;
        }
    }
    return false;
};


export function gameReducer(state: GameState, action: Action): GameState {
    switch (action.type) {
         case ActionType.LOAD_GAME: {
            const loadedState = action.payload;
            const hydratedState: GameState = {
                ...initialState,
                ...loadedState,
                colonists: loadedState.colonists.map((c: Colonist) => ({
                    ...initialState.colonists[0], 
                    ...c,
                })),
            };
            
            const tasksFromDesignations = derivePriorityTasks(hydratedState.designations, []);
            const taskMap = new Map(tasksFromDesignations.map(t => [t.id, t]));

            const validLoadedTasks = (loadedState.priorityTasks || []).filter(pt => taskMap.has(pt.id));
            const validLoadedTaskIds = new Set(validLoadedTasks.map(t => t.id));
            
            const newTasksToAdd = tasksFromDesignations.filter(t => !validLoadedTaskIds.has(t.id));

            hydratedState.priorityTasks = [...validLoadedTasks, ...newTasksToAdd];

            return hydratedState;
        }

        case ActionType.TICK: {
            const newState: GameState = JSON.parse(JSON.stringify(state)); 
            
            newState.tickCount++;
            newState.currentDay = Math.floor(newState.tickCount / C.DAY_LENGTH_TICKS) + 1;
            newState.currentHour = Math.floor((newState.tickCount % C.DAY_LENGTH_TICKS) / C.TICKS_PER_HOUR);

            let gridChanged = false;

            newState.activeEvents = state.activeEvents.map(e => ({ ...e, duration: e.duration - 1 })).filter(e => e.duration > 0);
            
            const addLogToState = (log: GameLogItem) => {
                 const time = new Date(); const timestamp = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}:${time.getSeconds().toString().padStart(2, '0')}`;
                 newState.gameLog.unshift({ msg: `[${timestamp}] ${log.msg}`, type: log.type });
                 if(newState.gameLog.length > 100) newState.gameLog.pop();
            }

            if (state.activeEvents.length > newState.activeEvents.length) {
                 addLogToState({msg: "An event's effects have worn off.", type: 'event'});
            }

            for (let y = 0; y < C.GRID_HEIGHT; y++) {
                for (let x = 0; x < C.GRID_WIDTH; x++) {
                    const tile = newState.grid[y][x];
                    if (tile.type === TileType.EMPTY && Math.random() < C.TREE_REGROWTH_CHANCE) { tile.type = TileType.SAPLING; tile.regrowthTicks = 0; gridChanged = true; } 
                    else if (tile.type === TileType.SAPLING) {
                        tile.regrowthTicks++;
                        if (tile.regrowthTicks >= C.SAPLING_TO_TREE_TICKS) { tile.type = TileType.TREE; tile.regrowthTicks = 0; gridChanged = true; }
                    } else if (tile.type === TileType.HYDROPONICS_TRAY && tile.growth !== undefined && tile.growth < C.CROP_GROWTH_DURATION) {
                        tile.growth++;
                        gridChanged = true;
                    }
                }
            }
            
            let mineralsThisTick = 0, gemsThisTick = 0, logsThisTick = 0, foodThisTick = 0, stoneThisTick = 0, happinessBoostThisTick = false;
            let reservedLogs = state.storedLogs; let reservedStone = state.storedStone; let reservedMinerals = state.storedMinerals; let reservedGems = state.storedGems;
            
            const deathsThisTick: { colonist: Colonist, cause: string }[] = [];
            const claimedTargetsThisTick = new Set<string>();
            state.colonists.forEach(p => { if (p.target) { claimedTargetsThisTick.add(`${p.target.x},${p.target.y}`); } });
            
            let workSpeedModifier = newState.activeEvents.some(e => e.id === 'PRODUCTIVITY_BOOST') ? 1.5 : 1;
            if (newState.activeEvents.some(e => e.id === 'MINOR_SETBACK')) workSpeedModifier *= 0.75;
            if (state.averageHappiness <= C.LOW_MORALE_THRESHOLD) workSpeedModifier *= 0.5;

            let happinessDecay = C.HAPPINESS_DECAY_rate;
            if(newState.activeEvents.some(e => e.id === 'HIGH_MORALE')) happinessDecay = 0;

            const softReset = (pawn: Colonist) => { dropCarriedItem(pawn, newState.grid); pawn.task = 'IDLE'; pawn.target = null; pawn.path = []; pawn.workTicks = 0; pawn.patience = C.COLONIST_PATIENCE; pawn.carrying = null; pawn.carryingAmount = undefined; };
            
            let currentColonists = newState.colonists;

            for (let i = 0; i < currentColonists.length; i++) {
                let nc = currentColonists[i];
                const pawnLocations = new Set(currentColonists.map(p => `${p.x},${p.y}`));

                if (nc.lastPosition && nc.x === nc.lastPosition.x && nc.y === nc.lastPosition.y) nc.stuckTicks++; else nc.stuckTicks = 0;
                nc.lastPosition = { x: nc.x, y: nc.y };

                if (nc.stuckTicks >= C.AUTO_UNSTUCK_HARD_TICKS) {
                    addLogToState({ msg: `${nc.name} was severely stuck. Teleporting to safety.`, type: 'event' });
                    const startX = Math.floor(C.GRID_WIDTH / 2); const startY = Math.floor(C.GRID_HEIGHT / 2);
                    dropCarriedItem(nc, newState.grid); nc.x = startX + i; nc.y = startY + 1; softReset(nc); nc.stuckTicks = 0; nc.hardResetCount++;
                    continue; 
                } else if (nc.stuckTicks === C.AUTO_UNSTUCK_SOFT_TICKS) {
                    addLogToState({ msg: `${nc.name} has been stuck. Resetting task.`, type: 'event' }); softReset(nc); nc.softResetCount++;
                }
                
                nc.happiness = Math.max(0, nc.happiness - happinessDecay); nc.hunger = Math.min(C.MAX_HUNGER, nc.hunger + C.HUNGER_INCREASE_RATE); nc.boredom = Math.min(C.MAX_BOREDOM, nc.boredom + C.BOREDOM_INCREASE_RATE);
                const energyCost = (nc.task === 'MINING' || nc.task === 'BUILDING' || nc.task === 'CHOPPING' || nc.carrying) ? 3 : 1;
                if (nc.task !== 'RESTING' && nc.task !== 'IDLE') nc.energy = Math.max(0, nc.energy - energyCost);
               
                if (nc.hunger >= C.CRITICAL_HUNGER_THRESHOLD) nc.criticallyLowHungerTicks++; else nc.criticallyLowHungerTicks = 0;
                if (nc.energy <= C.CRITICAL_ENERGY_THRESHOLD) nc.criticallyLowEnergyTicks++; else nc.criticallyLowEnergyTicks = 0;

                if (nc.criticallyLowHungerTicks === 1) { addLogToState({ msg: `${nc.name} is starving!`, type: 'event' }); }

                if (nc.criticallyLowHungerTicks > C.TICKS_TO_DEATH) { deathsThisTick.push({colonist: nc, cause: 'starvation'}); continue; }
                if (nc.criticallyLowEnergyTicks > C.TICKS_TO_DEATH) { deathsThisTick.push({colonist: nc, cause: 'exhaustion'}); continue; }

                const needs = [ { condition: nc.hunger >= C.URGENT_HUNGER_THRESHOLD, type: 'HUNGER' }, { condition: nc.energy <= C.LOW_ENERGY_THRESHOLD, type: 'ENERGY' }, { condition: nc.boredom >= C.HIGH_BOREDOM_THRESHOLD, type: 'BOREDOM' }, ];
                let assignedNeedTask = false;
                for (const need of needs) { if (need.condition) { let taskAssigned = false; if (need.type === 'ENERGY') { if (nc.task !== 'RESTING' && nc.task !== 'MOVING_TO_REST') { let bedTargets = []; for (let y = 0; y < C.GRID_HEIGHT; y++) for (let x = 0; x < C.GRID_WIDTH; x++) if (newState.grid[y]?.[x]?.type === TileType.BED && !pawnLocations.has(`${x},${y}`) && !claimedTargetsThisTick.has(`${x},${y}`)) bedTargets.push({x,y, dist: distance(nc, {x,y})}); bedTargets.sort((a,b) => a.dist - b.dist); for(const target of bedTargets) { const path = findPath(nc, target, newState.grid, pawnLocations); if (path) { dropCarriedItem(nc, newState.grid); nc.task = 'MOVING_TO_REST'; nc.path = path.slice(1); nc.target = target; addLogToState({msg: `${nc.name} is tired, going to rest.`, type: 'standard'}); claimedTargetsThisTick.add(`${target.x},${target.y}`); taskAssigned = true; break; } } } else { taskAssigned = true; } } else if (need.type === 'HUNGER') { if (nc.task !== 'EATING' && nc.task !== 'MOVING_TO_EAT') { if (state.storedFood > 0) { let storageTargets = []; for (let y = 0; y < C.GRID_HEIGHT; y++) for (let x = 0; x < C.GRID_WIDTH; x++) if (newState.grid[y]?.[x]?.type === TileType.STORAGE) storageTargets.push({x,y, dist: distance(nc, {x,y})}); storageTargets.sort((a,b) => a.dist - b.dist); for(const target of storageTargets) { const path = findPath(nc, target, newState.grid, pawnLocations); if (path) { dropCarriedItem(nc, newState.grid); nc.task = 'MOVING_TO_EAT'; nc.path = path.slice(1); nc.target = target; addLogToState({msg: `${nc.name} is hungry, going to get food.`, type: 'standard'}); taskAssigned = true; break; } } } else if (nc.roles.includes('COOK')) { let foodTaskFound = false; let harvestTargets: (Point & { dist: number })[] = []; for (let y = 0; y < C.GRID_HEIGHT; y++) for (let x = 0; x < C.GRID_WIDTH; x++) { const tile = newState.grid[y]?.[x]; if (tile?.type === TileType.HYDROPONICS_TRAY && tile.growth && tile.growth >= C.CROP_GROWTH_DURATION && !claimedTargetsThisTick.has(`${x},${y}`)) harvestTargets.push({x, y, dist: distance(nc, { x, y }) }); } harvestTargets.sort((a,b) => a.dist-b.dist); for(const target of harvestTargets) { const path = findPath(nc, target, newState.grid, pawnLocations); if(path) { dropCarriedItem(nc, newState.grid); nc.task = 'MOVING_TO_HARVEST'; nc.target = target; nc.path = path.slice(1); addLogToState({msg: `${nc.name} is starving and will harvest food.`, type: 'standard'}); claimedTargetsThisTick.add(`${target.x},${target.y}`); foodTaskFound = true; break; } } if(!foodTaskFound) { let plantTargets: (Point & { dist: number })[] = []; for (let y = 0; y < C.GRID_HEIGHT; y++) for (let x = 0; x < C.GRID_WIDTH; x++) { const tile = newState.grid[y]?.[x]; if (tile?.type === TileType.HYDROPONICS_TRAY && tile.growth === undefined && !claimedTargetsThisTick.has(`${x},${y}`)) plantTargets.push({x,y,dist:distance(nc,{x,y})}); } plantTargets.sort((a,b)=>a.dist-b.dist); for(const target of plantTargets) { const path = findPath(nc, target, newState.grid, pawnLocations); if(path) { dropCarriedItem(nc, newState.grid); nc.task = 'MOVING_TO_PLANT'; nc.target = target; nc.path = path.slice(1); addLogToState({msg: `${nc.name} is starving and will plant new crops.`, type: 'standard'}); claimedTargetsThisTick.add(`${target.x},${target.y}`); foodTaskFound = true; break; } } } if(foodTaskFound) taskAssigned = true; } } else { taskAssigned = true; } } else if (need.type === 'BOREDOM') { if (nc.task !== 'PLAYING' && nc.task !== 'MOVING_TO_PLAY') { let arcadeTargets = []; for (let y = 0; y < C.GRID_HEIGHT; y++) for (let x = 0; x < C.GRID_WIDTH; x++) if (newState.grid[y]?.[x]?.type === TileType.ARCADE_MACHINE && !pawnLocations.has(`${x},${y}`) && !claimedTargetsThisTick.has(`${x},${y}`)) arcadeTargets.push({x,y, dist: distance(nc, {x,y})}); arcadeTargets.sort((a,b) => a.dist - b.dist); for(const target of arcadeTargets) { const path = findPath(nc, target, newState.grid, pawnLocations); if (path) { dropCarriedItem(nc, newState.grid); nc.task = 'MOVING_TO_PLAY'; nc.path = path.slice(1); nc.target = target; addLogToState({msg: `${nc.name} is bored, going to play.`, type: 'standard'}); claimedTargetsThisTick.add(`${target.x},${target.y}`); taskAssigned = true; break; } } } else { taskAssigned = true; } } if (taskAssigned) { assignedNeedTask = true; break; } } }

                if (nc.task === 'IDLE' && !assignedNeedTask) { let taskFound = false; if (nc.carrying) { let s = findPathToNearest(nc, TileType.STORAGE, newState.grid, pawnLocations); if(s) { nc.task = 'MOVING_TO_STORAGE'; nc.path = s.path.slice(1); taskFound = true; } } if (!taskFound && nc.roles.includes('HAULER')) { let d = findPathToNearest(nc, TileType.DROPPED_MINERAL, newState.grid, pawnLocations) || findPathToNearest(nc, TileType.DROPPED_GEM, newState.grid, pawnLocations) || findPathToNearest(nc, TileType.DROPPED_LOG, newState.grid, pawnLocations) || findPathToNearest(nc, TileType.DROPPED_FOOD, newState.grid, pawnLocations) || findPathToNearest(nc, TileType.DROPPED_STONE, newState.grid, pawnLocations); if (d) { nc.task = 'MOVING_TO_HAUL'; nc.target = d.target; nc.path = d.path.slice(1); taskFound = true; addLogToState({msg: `${nc.name} is going to haul a resource.`, type: 'standard'}); } } if (!taskFound) { for (const task of state.priorityTasks) { const { x, y, type } = task; if (claimedTargetsThisTick.has(`${x},${y}`)) continue; let canDoTask = false; let canAfford = true; let cost = { logs: 0, stone: 0, minerals: 0, gems: 0 }; let isBuildTask = false; if ((type.includes('BUILD') || type.includes('UPGRADE'))) { isBuildTask = true; if (nc.roles.includes('BUILDER')) { canDoTask = true; switch (type) { case DesignationType.BUILD_WOOD_WALL: cost.logs = C.WALL_COST; break; case DesignationType.BUILD_DOOR: cost.logs = C.DOOR_COST; break; case DesignationType.BUILD_WOOD_FLOOR: cost.logs = C.FLOOR_COST; break; case DesignationType.BUILD_BED: cost.logs = C.BED_COST; break; case DesignationType.BUILD_STORAGE: cost.logs = C.STORAGE_COST; break; case DesignationType.BUILD_HYDROPONICS: cost = C.HYDROPONICS_COST; break; case DesignationType.BUILD_ARCADE: cost = C.ARCADE_COST; break; case DesignationType.BUILD_STONE_FLOOR: case DesignationType.UPGRADE_TO_STONE_FLOOR: cost.stone = C.STONE_FLOOR_COST; break; case DesignationType.BUILD_STONE_WALL: case DesignationType.UPGRADE_TO_STONE_WALL: cost.stone = C.STONE_WALL_COST; break; } if(reservedLogs < cost.logs || reservedStone < cost.stone || reservedMinerals < cost.minerals || reservedGems < cost.gems) canAfford = false; } } else if ((type === DesignationType.CHOP || type === DesignationType.MINE || type === DesignationType.HARVEST) && nc.roles.includes('MINER')) { canDoTask = true; } if (canDoTask && canAfford) { const targetPoint = { x, y }; const neighbors = [{ x: x - 1, y }, { x: x + 1, y }, { x, y: y - 1 }, { x, y: y + 1 }]; let bestPath: Point[] | null = null; for (const neighbor of neighbors) { if (newState.grid[neighbor.y]?.[neighbor.x]) { const path = findPath(nc, neighbor, newState.grid, pawnLocations); if (path && (!bestPath || path.length < bestPath.length)) bestPath = path; } } if (bestPath) { if (type.includes('BUILD') || type.includes('UPGRADE')) { nc.task = 'MOVING_TO_BUILD'; reservedLogs -= cost.logs; reservedStone -= cost.stone; reservedMinerals -= cost.minerals; reservedGems -= cost.gems; } else if (type === DesignationType.CHOP) nc.task = 'MOVING_TO_CHOP'; else nc.task = 'MOVING_TO_MINE'; nc.target = targetPoint; nc.path = bestPath.slice(1); taskFound = true; claimedTargetsThisTick.add(`${x},${y}`); addLogToState({ msg: `${nc.name} starting task: ${formatTypeName(type)}.`, type: 'standard' }); break; } } else if (isBuildTask && canDoTask && !canAfford) { let missingResource: 'LOGS' | 'STONE' | 'MINERALS' | 'GEMS' | null = null; if (reservedLogs < cost.logs) missingResource = 'LOGS'; else if (reservedStone < cost.stone) missingResource = 'STONE'; else if (reservedMinerals < cost.minerals) missingResource = 'MINERALS'; else if (reservedGems < cost.gems) missingResource = 'GEMS'; let prerequisiteTaskType: DesignationType | null = null; if (missingResource === 'LOGS') prerequisiteTaskType = DesignationType.CHOP; else if (missingResource) prerequisiteTaskType = DesignationType.MINE; const colonistCanGather = nc.roles.includes('MINER'); if (prerequisiteTaskType && colonistCanGather) { const prerequisiteTask = state.priorityTasks.find(pTask => { let pType = pTask.type; if (pType === DesignationType.HARVEST) { const tile = state.grid[pTask.y]?.[pTask.x]; if (tile) { if (tile.type === TileType.TREE) pType = DesignationType.CHOP; else pType = DesignationType.MINE; } } return pType === prerequisiteTaskType && !claimedTargetsThisTick.has(`${pTask.x},${pTask.y}`); }); if (prerequisiteTask) { const targetPoint = { x: prerequisiteTask.x, y: prerequisiteTask.y }; const neighbors = [{ x: targetPoint.x - 1, y: targetPoint.y }, { x: targetPoint.x + 1, y: targetPoint.y }, { x: targetPoint.x, y: targetPoint.y - 1 }, { x: targetPoint.x, y: targetPoint.y + 1 }]; let bestPath: Point[] | null = null; for (const neighbor of neighbors) { if (newState.grid[neighbor.y]?.[neighbor.x]) { const path = findPath(nc, neighbor, newState.grid, pawnLocations); if (path && (!bestPath || path.length < bestPath.length)) bestPath = path; } } if (bestPath) { if (prerequisiteTaskType === DesignationType.CHOP) nc.task = 'MOVING_TO_CHOP'; else nc.task = 'MOVING_TO_MINE'; nc.target = targetPoint; nc.path = bestPath.slice(1); taskFound = true; claimedTargetsThisTick.add(`${prerequisiteTask.x},${prerequisiteTask.y}`); addLogToState({ msg: `${nc.name} needs ${missingResource?.toLowerCase()} for ${formatTypeName(type)}, now going to ${formatTypeName(prerequisiteTaskType)}.`, type: 'standard' }); break; } } } } } } if (!taskFound && nc.roles.includes('COOK')) { let plantTargets: (Point & { dist: number })[] = []; for (let y = 0; y < C.GRID_HEIGHT; y++) for (let x = 0; x < C.GRID_WIDTH; x++) { const tile = newState.grid[y]?.[x]; if (tile?.type === TileType.HYDROPONICS_TRAY && tile.growth === undefined && !claimedTargetsThisTick.has(`${x},${y}`)) plantTargets.push({x,y,dist:distance(nc,{x,y})}); } plantTargets.sort((a,b)=>a.dist-b.dist); for(const target of plantTargets) { const path = findPath(nc, target, newState.grid, pawnLocations); if (path && path.length > 1) { nc.task = 'MOVING_TO_PLANT'; nc.target = target; nc.path = path.slice(1); taskFound = true; claimedTargetsThisTick.add(`${target.x},${target.y}`); addLogToState({ msg: `${nc.name} is going to plant crops.`, type: 'standard' }); break; } } } }

                if (nc.task.startsWith('MOVING_')) { if (nc.path.length > 0) { const nextStep = nc.path.shift() as Point; if (pawnLocations.has(`${nextStep.x},${nextStep.y}`)) { nc.path.unshift(nextStep); } else { nc.x = nextStep.x; nc.y = nextStep.y; } } else { switch (nc.task) { case 'MOVING_TO_IDLE': nc.task = 'IDLE'; break; case 'MOVING_TO_MINE': nc.task = 'MINING'; break; case 'MOVING_TO_CHOP': nc.task = 'CHOPPING'; break; case 'MOVING_TO_BUILD': nc.task = 'BUILDING'; break; case 'MOVING_TO_PLANT': nc.task = 'PLANTING'; break; case 'MOVING_TO_HARVEST': nc.task = 'HARVESTING_FOOD'; break; case 'MOVING_TO_HAUL': { const tile = newState.grid[nc.y][nc.x]; if (tile) { if(tile.type === TileType.DROPPED_MINERAL) nc.carrying = TileType.MINERAL; else if(tile.type === TileType.DROPPED_GEM) nc.carrying = TileType.GEM; else if(tile.type === TileType.DROPPED_LOG) nc.carrying = 'LOGS'; else if(tile.type === TileType.DROPPED_FOOD) nc.carrying = 'FOOD'; else if(tile.type === TileType.DROPPED_STONE) nc.carrying = 'STONE'; nc.carryingAmount = 1; tile.type = TileType.EMPTY; gridChanged = true; let s = findPathToNearest(nc, TileType.STORAGE, newState.grid, pawnLocations); if (s) { nc.task = 'MOVING_TO_STORAGE'; nc.path = s.path.slice(1); } else nc.task = 'IDLE'; } } break; case 'MOVING_TO_STORAGE': if(nc.carrying) { addLogToState({msg: `${nc.name} stored a ${nc.carrying.toLowerCase()}.`, type: 'standard'}); if(nc.carrying === TileType.MINERAL) mineralsThisTick++; else if(nc.carrying === TileType.GEM) gemsThisTick++; else if(nc.carrying === 'LOGS') logsThisTick++; else if(nc.carrying === 'STONE') stoneThisTick++; else if(nc.carrying === 'FOOD') foodThisTick += (nc.carryingAmount || 1); } nc.carrying = null; nc.carryingAmount = undefined; happinessBoostThisTick = true; nc.task = 'IDLE'; break; case 'MOVING_TO_REST': nc.task = 'RESTING'; break; case 'MOVING_TO_EAT': nc.task = 'EATING'; foodThisTick--; break; case 'MOVING_TO_PLAY': nc.task = 'PLAYING'; break; } } }

                if (nc.task === 'MINING' || nc.task === 'CHOPPING' || nc.task === 'BUILDING' || nc.task === 'PLANTING' || nc.task === 'HARVESTING_FOOD') { const requiredDuration = nc.task === 'MINING' ? C.MINING_DURATION : nc.task === 'CHOPPING' ? C.CHOPPING_DURATION : nc.task === 'PLANTING' ? C.PLANTING_DURATION : nc.task === 'HARVESTING_FOOD' ? C.HARVESTING_DURATION : C.BUILD_DURATION; nc.workTicks += workSpeedModifier; if (nc.workTicks >= requiredDuration) { const {x, y} = nc.target!; const targetTile = newState.grid[y][x]; const targetDesignation = newState.designations[y][x]; if (nc.task === 'HARVESTING_FOOD') { addLogToState({msg: `${nc.name} harvested ${C.FOOD_YIELD_PER_HARVEST} food at (${x}, ${y}).`, type: 'standard'}); targetTile.growth = undefined; gridChanged = true; nc.carrying = 'FOOD'; nc.carryingAmount = C.FOOD_YIELD_PER_HARVEST; let s = findPathToNearest(nc, TileType.STORAGE, newState.grid, pawnLocations); if (s) { nc.task = 'MOVING_TO_STORAGE'; nc.path = s.path.slice(1); } else { nc.task = 'IDLE'; } } else { if(nc.task === 'MINING') { addLogToState({msg: `${nc.name} finished mining at (${x}, ${y}).`, type: 'standard'}); if (targetTile.type === TileType.MINERAL) targetTile.type = TileType.DROPPED_MINERAL; else if (targetTile.type === TileType.GEM) targetTile.type = TileType.DROPPED_GEM; else if (targetTile.type === TileType.ROCK) targetTile.type = TileType.DROPPED_STONE; } else if (nc.task === 'CHOPPING') { addLogToState({msg: `${nc.name} finished chopping at (${x}, ${y}).`, type: 'standard'}); targetTile.type = TileType.DROPPED_LOG; } else if (nc.task === 'BUILDING') { const buildType = targetDesignation!.replace('BUILD_', '').replace('UPGRADE_TO_', 'upgrade to ').replace(/_/g, ' ').toLowerCase(); addLogToState({msg: `${nc.name} finished building ${buildType} at (${x}, ${y}).`, type: 'standard'}); switch (targetDesignation) { case DesignationType.BUILD_WOOD_FLOOR: targetTile.type = TileType.WOOD_FLOOR; logsThisTick -= C.FLOOR_COST; break; case DesignationType.BUILD_WOOD_WALL: targetTile.type = TileType.WOOD_WALL; logsThisTick -= C.WALL_COST; break; case DesignationType.BUILD_STONE_FLOOR: case DesignationType.UPGRADE_TO_STONE_FLOOR: targetTile.type = TileType.STONE_FLOOR; stoneThisTick -= C.STONE_FLOOR_COST; break; case DesignationType.BUILD_STONE_WALL: case DesignationType.UPGRADE_TO_STONE_WALL: targetTile.type = TileType.STONE_WALL; stoneThisTick -= C.STONE_WALL_COST; break; case DesignationType.BUILD_DOOR: targetTile.type = TileType.DOOR; logsThisTick -= C.DOOR_COST; break; case DesignationType.BUILD_BED: targetTile.type = TileType.BED; logsThisTick -= C.BED_COST; break; case DesignationType.BUILD_STORAGE: targetTile.type = TileType.STORAGE; logsThisTick -= C.STORAGE_COST; break; case DesignationType.BUILD_HYDROPONICS: targetTile.type = TileType.HYDROPONICS_TRAY; logsThisTick -= C.HYDROPONICS_COST.logs; stoneThisTick -= C.HYDROPONICS_COST.stone; mineralsThisTick -= C.HYDROPONICS_COST.minerals; gemsThisTick -= C.HYDROPONICS_COST.gems; break; case DesignationType.BUILD_ARCADE: targetTile.type = TileType.ARCADE_MACHINE; logsThisTick -= C.ARCADE_COST.logs; stoneThisTick -= C.ARCADE_COST.stone; mineralsThisTick -= C.ARCADE_COST.minerals; gemsThisTick -= C.ARCADE_COST.gems; break; } } else if (nc.task === 'PLANTING') { addLogToState({msg: `${nc.name} finished planting at (${x}, ${y}).`, type: 'standard'}); targetTile.growth = 0; } gridChanged = true; newState.designations[y][x] = null; nc.task = 'IDLE'; } nc.workTicks = 0; nc.target = null; } }
                if (nc.task === 'RESTING') { if (nc.energy >= C.MAX_ENERGY) { nc.energy = C.MAX_ENERGY; nc.task = 'IDLE'; addLogToState({msg: `${nc.name} is fully rested.`, type: 'standard'}); } else { nc.energy += 10; } }
                if (nc.task === 'EATING') { nc.hunger = Math.max(0, nc.hunger - C.FOOD_NUTRITION); nc.task = 'IDLE'; addLogToState({msg: `${nc.name} finished eating.`, type: 'standard'}); }
                if (nc.task === 'PLAYING') { if (nc.boredom <= 0) { nc.boredom = 0; nc.task = 'IDLE'; addLogToState({msg: `${nc.name} is no longer bored.`, type: 'standard'}); } else { nc.boredom -= C.FUN_RECOVERY_RATE; } }
            }
            
            let finalColonists = currentColonists;
            if (deathsThisTick.length > 0) {
                 deathsThisTick.forEach(death => { addLogToState({ msg: `${death.colonist.name} has died from ${death.cause}.`, type: 'event' }); });
                 const deadIds = new Set(deathsThisTick.map(d => d.colonist.id));
                 finalColonists = currentColonists.filter(c => !deadIds.has(c.id)).map(c => ({...c, happiness: Math.max(0, c.happiness - (C.HAPPINESS_PENALTY_PER_DEATH * deathsThisTick.length))}));
                 if (finalColonists.length === 0) { addLogToState({ msg: "The last colonist has perished. The simulation has failed.", type: 'event' }); }
            }

            if(happinessBoostThisTick && finalColonists.length > 0) { finalColonists = finalColonists.map(c => ({ ...c, happiness: Math.min(C.MAX_HAPPINESS, c.happiness + C.HAPPINESS_BOOST_ON_STORE) })); }
            
            newState.colonists = finalColonists;
            newState.storedMinerals += mineralsThisTick; newState.storedGems += gemsThisTick; newState.storedLogs += logsThisTick; newState.storedStone += stoneThisTick; newState.storedFood += foodThisTick;
            newState.colonistLogs = recordColonistWorkLog(state.colonistLogs, newState.colonists, newState.tickCount);
            
            if (newState.storedMinerals >= state.currentGoal) {
                const newLevel = state.milestoneLevel + 1;
                newState.milestoneLevel = newLevel;
                newState.currentGoal = C.INITIAL_GOAL + newLevel * C.GOAL_INCREMENT;
                 addLogToState({ msg: `MILESTONE REACHED! Next goal: ${newState.currentGoal} minerals.`, type: "event" });
            }
            
            newState.colonyStats.softResets = finalColonists.reduce((sum, c) => sum + c.softResetCount, 0);
            newState.colonyStats.hardResets = finalColonists.reduce((sum, c) => sum + c.hardResetCount, 0);
            newState.averageHappiness = finalColonists.reduce((sum, c) => sum + c.happiness, 0) / (finalColonists.length || 1);
            newState.priorityTasks = derivePriorityTasks(newState.designations, state.priorityTasks);
            
            return newState;
        }

        case ActionType.RESET_GAME: {
            const { seed, storyData } = action.payload;
            const newGrid = generateProceduralGrid(seed);
            const newDesignations: Designations = Array.from({ length: C.GRID_HEIGHT }, () => Array(C.GRID_WIDTH).fill(null));
            const startX = Math.floor(C.GRID_WIDTH / 2);
            const startY = Math.floor(C.GRID_HEIGHT / 2);

            const shelterRect = { x0: startX - 4, y0: startY, x1: startX + 4, y1: startY + 5 };
            for(let x = shelterRect.x0; x <= shelterRect.x1; x++) {
                if(newGrid[shelterRect.y0]?.[x]) newDesignations[shelterRect.y0][x] = DesignationType.BUILD_WOOD_WALL;
                if(newGrid[shelterRect.y1]?.[x]) newDesignations[shelterRect.y1][x] = DesignationType.BUILD_WOOD_WALL;
            }
            for(let y = shelterRect.y0 + 1; y < shelterRect.y1; y++) {
                if(newGrid[y]?.[shelterRect.x0]) newDesignations[y][shelterRect.x0] = DesignationType.BUILD_WOOD_WALL;
                if(newGrid[y]?.[shelterRect.x1]) newDesignations[y][shelterRect.x1] = DesignationType.BUILD_WOOD_WALL;
            }
            if(newGrid[shelterRect.y1]?.[startX]) newDesignations[shelterRect.y1][startX] = DesignationType.BUILD_DOOR;
            
            const newColonists: Colonist[] = storyData.colonists.map((c: any, i: number) => ({
                id: `Colonist-${i + 1}`, name: c.name, backstory: c.backstory, x: startX + i, y: startY + 1, task: 'IDLE', target: null, path: [], workTicks: 0, carrying: null, carryingAmount: 0, energy: C.MAX_ENERGY, happiness: C.MAX_HAPPINESS, patience: C.COLONIST_PATIENCE, hunger: 0, boredom: 0, roles: ['COOK', 'BUILDER', 'MINER', 'HAULER'], stuckTicks: 0, lastPosition: { x: startX + i, y: startY + 1 }, criticallyLowEnergyTicks: 0, criticallyLowHungerTicks: 0, softResetCount: 0, hardResetCount: 0,
            }));

            const priorityTasks = derivePriorityTasks(newDesignations, []);

            return {
                ...initialState,
                seed,
                grid: newGrid,
                designations: newDesignations,
                colonists: newColonists,
                colonyName: storyData.colonyName,
                asteroidName: storyData.asteroidName,
                chronology: [{ timestamp: 'Day 1, 06:00', message: storyData.firstEntry }],
                colonistLogs: Array.from({ length: newColonists.length }, () => Array(C.DAY_LENGTH_TICKS).fill(null)),
                priorityTasks,
            };
        }
        case ActionType.SET_SEED:
            return { ...state, seed: action.payload };
        case ActionType.ADD_LOG: {
            const time = new Date();
            const timestamp = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}:${time.getSeconds().toString().padStart(2, '0')}`;
            const newLog: GameLogItem = { msg: `[${timestamp}] ${action.payload.message}`, type: action.payload.type };
            return { ...state, gameLog: [newLog, ...state.gameLog].slice(0, 100) };
        }
        case ActionType.ADD_CHRONOLOGY: {
            const timestamp = `Day ${state.currentDay}, ${String(state.currentHour).padStart(2, '0')}:00`;
            return { ...state, chronology: [...state.chronology, { timestamp, message: action.payload }] };
        }
        case ActionType.SET_API_FAILED:
            return { ...state, apiFailed: action.payload };
        case ActionType.UPDATE_COLONIST_ROLES: {
             return { ...state, colonists: state.colonists.map(c => c.id === action.payload.id ? { ...c, roles: action.payload.roles } : c) };
        }
        case ActionType.REORDER_PRIORITY_TASKS:
            return { ...state, priorityTasks: action.payload };
        case ActionType.UPDATE_SIMULATION_SETTINGS:
            return { ...state, simulationSettings: action.payload };
        case ActionType.SET_DESIGNATION: {
            const { start, end, type, dragStartDesignations } = action.payload;
            const newD = (dragStartDesignations || state.designations).map(r => [...r]);
            const x0 = Math.min(start.x, end.x), x1 = Math.max(start.x, end.x);
            const y0 = Math.min(start.y, end.y), y1 = Math.max(start.y, end.y);
            const isHollow = type === DesignationType.BUILD_WOOD_WALL || type === DesignationType.BUILD_DOOR || type === DesignationType.BUILD_STONE_WALL;
            for (let y = y0; y <= y1; y++) {
                for (let x = x0; x <= x1; x++) {
                    if (isHollow && (y > y0 && y < y1 && x > x0 && x < x1)) continue;
                    let desType = type;
                    if (type === DesignationType.HARVEST) {
                        const tileType = state.grid[y]?.[x]?.type;
                        if(tileType === TileType.TREE) desType = DesignationType.CHOP;
                        else if (tileType) desType = DesignationType.MINE;
                        else continue;
                    }
                    if (desType && state.grid[y]?.[x] && isTileDesignatable(state.grid[y][x].type, desType)) {
                        newD[y][x] = newD[y][x] === desType && x0 === x1 && y0 === y1 ? null : desType;
                    }
                }
            }
            const newPriorityTasks = derivePriorityTasks(newD, state.priorityTasks);
            return { ...state, designations: newD, priorityTasks: newPriorityTasks };
        }
       case ActionType.SOFT_RESET_COLONISTS: {
            const newGrid = state.grid.map(r => r.map(c => ({ ...c })));
            let gridChanged = false;
            const updatedColonists = state.colonists.map(c => {
                if (dropCarriedItem(c, newGrid)) {
                    gridChanged = true;
                }
                return { ...c, task: 'IDLE', target: null, path: [], workTicks: 0, patience: C.COLONIST_PATIENCE, carrying: null, carryingAmount: undefined };
            });
            return { ...state, grid: gridChanged ? newGrid : state.grid, colonists: updatedColonists };
        }

        case ActionType.HARD_RESET_COLONISTS: {
            const newGrid = state.grid.map(r => r.map(c => ({...c})));
            let gridChanged = false;
            const startX = Math.floor(C.GRID_WIDTH / 2);
            const startY = Math.floor(C.GRID_HEIGHT / 2);
            const updatedColonists = state.colonists.map((c, i) => {
                if (dropCarriedItem(c, newGrid)) {
                    gridChanged = true;
                }
                return {
                    ...c, x: startX + i, y: startY + 1, task: 'IDLE', target: null, path: [], workTicks: 0, patience: C.COLONIST_PATIENCE, carrying: null, carryingAmount: undefined, energy: C.MAX_ENERGY, hunger: 0, boredom: 0, stuckTicks: 0
                };
            });
            return { ...state, grid: gridChanged ? newGrid : state.grid, colonists: updatedColonists };
        }
        case ActionType.ADD_COLONIST: {
            const { name, backstory } = action.payload;
            const startX = Math.floor(C.GRID_WIDTH / 2);
            const startY = Math.floor(C.GRID_HEIGHT / 2);
            const newColonist: Colonist = {
                 id: `Colonist-${state.colonists.length + 1}`, name, backstory, x: startX, y: startY, task: 'IDLE', target: null, path: [], workTicks: 0, carrying: null, energy: C.MAX_ENERGY, happiness: C.MAX_HAPPINESS, patience: C.COLONIST_PATIENCE, hunger: 0, boredom: 0, roles: ['COOK', 'BUILDER', 'MINER', 'HAULER'], stuckTicks: 0, lastPosition: {x: startX, y: startY}, criticallyLowEnergyTicks: 0, criticallyLowHungerTicks: 0, softResetCount: 0, hardResetCount: 0, carryingAmount: 0,
            };
            return { ...state, colonists: [...state.colonists, newColonist], colonistLogs: [...state.colonistLogs, Array(C.DAY_LENGTH_TICKS).fill(null)] };
        }
        case ActionType.TRIGGER_ACCIDENT: {
            if (state.colonists.length <= 1) return state;
            const victimIndex = Math.floor(Math.random() * state.colonists.length);
            const victim = state.colonists[victimIndex];
            const newColonists = state.colonists.filter((_, i) => i !== victimIndex);
            const newLogs = state.colonistLogs.filter((_, i) => i !== victimIndex);
            const time = new Date(); const timestamp = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}:${time.getSeconds().toString().padStart(2, '0')}`;
            const newGameLog = [{ msg: `[${timestamp}] ${victim.name} has died in a tragic accident.`, type: 'event' as const }, ...state.gameLog].slice(0, 100);
            return { ...state, colonists: newColonists, colonistLogs: newLogs, gameLog: newGameLog };
        }
        case ActionType.TRIGGER_METEOR_SHOWER: {
            const newGrid = state.grid.map(r => r.map(c => ({...c})));
            const impactX = Math.floor(Math.random() * C.GRID_WIDTH);
            const impactY = Math.floor(Math.random() * C.GRID_HEIGHT);
            const radius = 3 + Math.floor(Math.random() * 3);
            for (let y = impactY - radius; y <= impactY + radius; y++) {
                for (let x = impactX - radius; x <= impactX + radius; x++) {
                    if (newGrid[y]?.[x] && newGrid[y][x].type === TileType.ROCK && distance({ x, y }, { x: impactX, y: impactY }) <= radius) {
                        if (Math.random() < 0.1) newGrid[y][x].type = TileType.GEM;
                        else if (Math.random() < 0.5) newGrid[y][x].type = TileType.MINERAL;
                    }
                }
            }
            return { ...state, grid: newGrid };
        }
        case ActionType.ADD_EVENT: {
            return { ...state, activeEvents: [...state.activeEvents.filter(e => e.id !== action.payload.id), action.payload] };
        }

        default:
            return state;
    }
}


function findPathToNearest(start: Point, targetType: TileType, grid: Grid, pawnLocations: Set<string>, claimedTargets?: Set<string>): { path: Point[], target: Point } | null {
    let targets: Point[] = [];
    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[y].length; x++) {
            if (grid[y][x].type === targetType && (!claimedTargets || !claimedTargets.has(`${x},${y}`))) {
                targets.push({ x, y });
            }
        }
    }

    targets.sort((a, b) => distance(start, a) - distance(start, b));

    for (const target of targets) {
        const path = findPath(start, target, grid, pawnLocations);
        if (path) {
            return { path, target };
        }
    }
    return null;
}