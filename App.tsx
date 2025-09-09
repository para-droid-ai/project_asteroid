import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Colonist, ColonistLog, Designations, DesignationType, GameEvent, GameLogItem, Grid, InteractionMode, Point, Tile, TileType } from './types';
import * as C from './constants';
import { distance } from './utils/geometry';
import { createPRNG, createNoise2D } from './utils/noise';
import { findPath } from './utils/pathfinding';

import { IntroModal } from './components/IntroModal';
import { StatsPanel } from './components/StatsPanel';
import { EventsPanel } from './components/EventsPanel';
import { EventModal } from './components/EventModal';
import { SettingsModal } from './components/SettingsModal';
import { Legend } from './components/Legend';
import { CombinedInspectorPanel } from './components/CombinedInspectorPanel';
import { ColonistQuickSelectPanel } from './components/ColonistQuickSelectPanel';
import { GameLogPanel } from './components/GameLogPanel';
import { ColonistWorkLogPanel } from './components/ColonistWorkLogPanel';
import { BuildMenu } from './components/BuildMenu';

export default function App() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [grid, setGrid] = useState<Grid | null>(null);
    const [designations, setDesignations] = useState<Designations | null>(null);
    const [colonists, setColonists] = useState<Colonist[]>([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [showIntro, setShowIntro] = useState(true);
    const [storedMinerals, setStoredMinerals] = useState(0);
    const [storedGems, setStoredGems] = useState(0);
    const [storedLogs, setStoredLogs] = useState(0);
    const [selectedColonist, setSelectedColonist] = useState<Colonist | null>(null);
    const [averageHappiness, setAverageHappiness] = useState(C.MAX_HAPPINESS);
    const [workEfficiency, setWorkEfficiency] = useState(0);
    const [milestoneLevel, setMilestoneLevel] = useState(0);
    const [currentGoal, setCurrentGoal] = useState(C.INITIAL_GOAL);
    const [activeEvents, setActiveEvents] = useState<GameEvent[]>([]);
    const [eventPopup, setEventPopup] = useState<GameEvent | null>(null);
    const [hoveredTile, setHoveredTile] = useState<Tile | null>(null);
    const [gameLog, setGameLog] = useState<GameLogItem[]>([]);
    const [gameTime, setGameTime] = useState(0);
    const [interactionMode, setInteractionMode] = useState<InteractionMode>('INSPECT');
    const [designationType, setDesignationType] = useState<DesignationType | null>(null);
    const [importError, setImportError] = useState("");
    const [tickCount, setTickCount] = useState(0);
    const [currentDay, setCurrentDay] = useState(1);
    const [currentHour, setCurrentHour] = useState(6);
    const [seed, setSeed] = useState('1134');
    const [showSettings, setShowSettings] = useState(false);
    const [cursor, setCursor] = useState('default');

    const [colonistLogs, setColonistLogs] = useState<ColonistLog[]>(() =>
        Array.from({ length: C.INITIAL_COLONIST_COUNT }, () => Array(C.DAY_LENGTH_TICKS).fill(null))
    );

    const isDesignating = useRef(false);
    const designationStart = useRef<Point | null>(null);
    const designationDragStart = useRef<Designations | null>(null);

    const isDay = (currentHour >= 7 && currentHour < 19);

    const addLog = useCallback((message: string, type: 'standard' | 'event' = 'standard') => {
        const time = new Date();
        const timestamp = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}:${time.getSeconds().toString().padStart(2, '0')}`;
        setGameLog(prevLog => [{msg: `[${timestamp}] ${message}`, type}, ...prevLog].slice(0, 100));
    }, []);

    const validTile = (arr: any[][], y: number, x: number) => arr && arr[y] && arr[y][x] !== undefined;

    const generateProceduralGrid = useCallback((currentSeed: string): Grid => {
        addLog(`Generating new asteroid with seed: ${currentSeed}...`);
        const prng = createPRNG(currentSeed);
        const noise2D = createNoise2D(prng); const mineralNoise2D = createNoise2D(prng); const gemNoise2D = createNoise2D(prng); const treeNoise2D = createNoise2D(prng);
        let newGrid: Grid = Array.from({ length: C.GRID_HEIGHT }, (_, y) => Array(C.GRID_WIDTH).fill(null).map((__, x) => ({ x, y, type: TileType.EMPTY, regrowthTicks: 0 })));
        
        for (let y = 0; y < C.GRID_HEIGHT; y++) for (let x = 0; x < C.GRID_WIDTH; x++) { if (noise2D(x / 20, y / 20) > -0.2) newGrid[y][x].type = TileType.ROCK; }
        
        for (let i = 0; i < 4; i++) {
            let tempGrid: Grid = newGrid.map(row => row.map(cell => ({ ...cell })));
            for (let y = 1; y < C.GRID_HEIGHT - 1; y++) for (let x = 1; x < C.GRID_WIDTH - 1; x++) {
                let wallCount = 0;
                for (let ny = y - 1; ny <= y + 1; ny++) for (let nx = x - 1; nx <= x + 1; nx++) { if (ny === y && nx === x) continue; if (newGrid[ny][nx].type === TileType.ROCK) wallCount++; }
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
                if(validTile(newGrid, y, x)) newGrid[y][x].type = TileType.FLOOR;
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

        for (let i = 0; i < 5; i++) { newGrid[startY + 2][startX - 2 + i].type = TileType.STORAGE; newGrid[startY + 4][startX - 2 + i].type = TileType.BED; }
        
        addLog('Asteroid generation complete.');
        return newGrid;
    }, [addLog]);

    const isTileDesignatable = (type: TileType, designation: DesignationType) => {
        if (designation === DesignationType.HARVEST || designation === DesignationType.MINE) return type === TileType.ROCK || type === TileType.MINERAL || type === TileType.GEM || type === TileType.TREE;
        if (designation === DesignationType.CHOP) return type === TileType.TREE;
        if (designation === DesignationType.BUILD_FLOOR || designation === DesignationType.BUILD_WALL || designation === DesignationType.BUILD_DOOR || designation === DesignationType.BUILD_BED || designation === DesignationType.BUILD_STORAGE) return type === TileType.EMPTY || type === TileType.FLOOR;
        return false;
    };
    
    const handleExportJson = () => {
        const state = { grid, designations, colonists, storedMinerals, storedGems, storedLogs, averageHappiness, milestoneLevel, currentGoal, gameLog, gameTime, tickCount, currentDay, currentHour, colonistLogs, seed, activeEvents };
        const json = JSON.stringify(state, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `project-asteroid-save-${seed}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleImportJson = (evt: React.ChangeEvent<HTMLInputElement>) => {
        const file = evt.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const state = JSON.parse(e.target?.result as string);
                if (!state.grid || !state.colonists) throw new Error("Invalid save file.");
                setGrid(state.grid);
                setDesignations(state.designations);
                setColonists(state.colonists);
                setStoredMinerals(state.storedMinerals || 0);
                setStoredGems(state.storedGems || 0);
                setStoredLogs(state.storedLogs || 0);
                setAverageHappiness(state.averageHappiness || C.MAX_HAPPINESS);
                setMilestoneLevel(state.milestoneLevel || 0);
                setCurrentGoal(state.currentGoal || C.INITIAL_GOAL);
                setGameLog(state.gameLog || []);
                setGameTime(state.gameTime || 0);
                setTickCount(state.tickCount || 0);
                setCurrentDay(state.currentDay || 1);
                setCurrentHour(state.currentHour || 6);
                // FIX: Make fallback for colonist logs more robust in case colonists array is missing from save file.
                setColonistLogs(state.colonistLogs || Array.from({ length: (state.colonists || []).length }, () => Array(C.DAY_LENGTH_TICKS).fill(null)));
                setSeed(state.seed || 'imported');
                setActiveEvents(state.activeEvents || []);
                setSelectedColonist(null);
                setIsPlaying(false);
                setShowIntro(false);
                setImportError("Loaded successfully!");
            } catch (ex) {
                // FIX: Improve error handling for file import failures.
                const message = ex instanceof Error ? ex.message : String(ex);
                setImportError(`Import failed: ${message}`);
            }
        };
        reader.readAsText(file);
        evt.target.value = "";
    };

    const resetGame = useCallback(() => {
        setImportError("");
        const currentSeed = seed || Date.now().toString();
        if(!seed) setSeed(currentSeed);
        const newGrid = generateProceduralGrid(currentSeed);
        const newDesignations: Designations = Array.from({ length: C.GRID_HEIGHT }, () => Array(C.GRID_WIDTH).fill(null));
        
        const startX = Math.floor(C.GRID_WIDTH / 2);
        const startY = Math.floor(C.GRID_HEIGHT / 2);
        const shelterRect = { x0: startX - 4, y0: startY, x1: startX + 4, y1: startY + 5 };
        for(let x = shelterRect.x0; x <= shelterRect.x1; x++) {
            if(validTile(newGrid, shelterRect.y0, x) && isTileDesignatable(newGrid[shelterRect.y0][x].type, DesignationType.BUILD_WALL)) newDesignations[shelterRect.y0][x] = DesignationType.BUILD_WALL;
            if(validTile(newGrid, shelterRect.y1, x) && isTileDesignatable(newGrid[shelterRect.y1][x].type, DesignationType.BUILD_WALL)) newDesignations[shelterRect.y1][x] = DesignationType.BUILD_WALL;
        }
        for(let y = shelterRect.y0 + 1; y < shelterRect.y1; y++) {
            if(validTile(newGrid, y, shelterRect.x0) && isTileDesignatable(newGrid[y][shelterRect.x0].type, DesignationType.BUILD_WALL)) newDesignations[y][shelterRect.x0] = DesignationType.BUILD_WALL;
            if(validTile(newGrid, y, shelterRect.x1) && isTileDesignatable(newGrid[y][shelterRect.x1].type, DesignationType.BUILD_WALL)) newDesignations[y][shelterRect.x1] = DesignationType.BUILD_WALL;
        }
        const doorX = startX;
        const doorY = shelterRect.y1;
        if(validTile(newGrid, doorY, doorX)) newDesignations[doorY][doorX] = DesignationType.BUILD_DOOR;

        const startingPos = { x: startX, y: startY };
        const newColonists: Colonist[] = Array.from({ length: C.INITIAL_COLONIST_COUNT }, (v, i) => ({ id: `Colonist-${i + 1}`, x: startingPos.x + i, y: startingPos.y + 1, task: 'IDLE', target: null, path: [], workTicks: 0, carrying: null, energy: C.MAX_ENERGY, happiness: C.MAX_HAPPINESS, patience: C.COLONIST_PATIENCE }));
        setGrid(newGrid);
        setDesignations(newDesignations);
        setColonists(newColonists);
        setStoredMinerals(0); setStoredGems(0); setStoredLogs(0); setSelectedColonist(null); setAverageHappiness(C.MAX_HAPPINESS);
        setMilestoneLevel(0); setCurrentGoal(C.INITIAL_GOAL);
        setActiveEvents([]);
        setEventPopup(null);
        setIsPlaying(false); 
        setShowIntro(true);
        setGameLog([]); setGameTime(0);
        setTickCount(0); setCurrentDay(1); setCurrentHour(6);
        setColonistLogs(Array.from({ length: C.INITIAL_COLONIST_COUNT }, () => Array(C.DAY_LENGTH_TICKS).fill(null)));
        addLog('Colony established. Good luck.');
    }, [generateProceduralGrid, addLog, seed]);

    useEffect(() => { resetGame(); // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const recordColonistWorkLog = useCallback((updatedColonists: Colonist[], tickNum: number) => {
        setColonistLogs(logs => {
            const newLogs = Array.from({length: updatedColonists.length}, (_, i) => logs[i] || Array(C.DAY_LENGTH_TICKS).fill(null));
            updatedColonists.forEach((colonist, idx) => {
                const activityEntry = { task: colonist.task, carrying: colonist.carrying };
                 if(newLogs[idx]) {
                    newLogs[idx][tickNum % newLogs[idx].length] = activityEntry;
                }
            });
            return newLogs;
        });
    }, []);
    
    useEffect(() => {
        if (!colonistLogs || colonistLogs.length === 0 || !colonistLogs[0] || colonistLogs[0].length === 0) return;
        let totalProductiveTicks = 0;
        let totalTicksConsidered = 0;
        colonistLogs.forEach(log => {
            if (!log) return;
            const relevantTicks = log.slice(0, Math.min(tickCount, log.length)).filter(Boolean);
            let productiveTicks = 0;
            let nonRestingTicks = 0;
            relevantTicks.forEach(entry => {
                if (entry && entry.task !== 'RESTING' && entry.task !== 'MOVING_TO_REST') {
                    nonRestingTicks++;
                    if (entry.task === 'MINING' || entry.task === 'BUILDING' || entry.task === 'CHOPPING' || entry.task.includes('HAUL') || entry.task.includes('STORAGE')) {
                        productiveTicks++;
                    }
                }
            });
            if(nonRestingTicks > 0) { totalProductiveTicks += productiveTicks; totalTicksConsidered += nonRestingTicks; }
        });
        const efficiency = totalTicksConsidered > 0 ? (totalProductiveTicks / totalTicksConsidered) * 100 : 0;
        setWorkEfficiency(efficiency);
    }, [colonistLogs, tickCount]);


    const gameTick = useCallback(() => {
        if (!grid || !designations) return;
        const currentTick = tickCount + 1;
        setGameTime(t => t + 1);
        setTickCount(currentTick);

        if ((currentTick % C.DAY_LENGTH_TICKS) === 0) setCurrentDay(day => day + 1);
        setCurrentHour(Math.floor((currentTick % C.DAY_LENGTH_TICKS) / C.TICKS_PER_HOUR));

        let newGrid: Grid = grid.map(row => row.map(cell => ({...cell})));
        let newDesignations: Designations = designations.map(row => [...row]);
        let gridChanged = false;

        const updatedEvents = activeEvents.map(e => ({...e, duration: e.duration - 1 })).filter(e => e.duration > 0);
        if(activeEvents.length > updatedEvents.length) addLog("An event's effects have worn off.", "event");
        setActiveEvents(updatedEvents);

        if (currentTick % C.DAY_LENGTH_TICKS === 1 && currentTick > 1) {
            if (Math.random() < C.DAILY_EVENT_CHANCE) {
                const eventTypes: GameEvent[] = [
                    { id: 'METEOR_SHOWER', duration: 1, message: "A small meteor shower impacts the surface, revealing new minerals!", type: 'event', pauses: true },
                    { id: 'HIGH_MORALE', duration: C.DAY_LENGTH_TICKS / 2, message: "Everyone is feeling particularly cheerful today!", type: 'event', pauses: true },
                    { id: 'PRODUCTIVITY_BOOST', duration: C.DAY_LENGTH_TICKS / 2, message: "A surge of motivation improves work speed.", type: 'event', pauses: true },
                    { id: 'MINOR_SETBACK', duration: C.DAY_LENGTH_TICKS / 2, message: "A tool malfunction is slowing down work.", type: 'event', pauses: true },
                    { id: 'NEW_COLONIST', duration: 1, message: "A wanderer has arrived and joined the colony!", type: 'event', pauses: true },
                    { id: 'TRAGIC_ACCIDENT', duration: 1, message: "A tragic accident has occurred.", type: 'event', pauses: true },
                ];
                let event = eventTypes[Math.floor(Math.random() * eventTypes.length)];
                
                if (event.id === 'TRAGIC_ACCIDENT' && colonists.length <= 1) event = eventTypes[0];
                
                addLog(event.message, event.type as 'event');
                setEventPopup(event);
                setIsPlaying(false);

                if(event.id === 'METEOR_SHOWER') {
                    const impactX = Math.floor(Math.random() * C.GRID_WIDTH);
                    const impactY = Math.floor(Math.random() * C.GRID_HEIGHT);
                    const radius = 3 + Math.floor(Math.random() * 3);
                     for(let y = impactY - radius; y <= impactY + radius; y++) {
                        for(let x = impactX - radius; x <= impactX + radius; x++) {
                            if(validTile(newGrid, y, x) && newGrid[y][x].type === TileType.ROCK && distance({x,y}, {x:impactX, y:impactY}) <= radius) {
                                if(Math.random() < 0.1) newGrid[y][x].type = TileType.GEM;
                                else if (Math.random() < 0.5) newGrid[y][x].type = TileType.MINERAL;
                            }
                        }
                    }
                    gridChanged = true;
                }
            }
        }
        
        for (let y = 0; y < C.GRID_HEIGHT; y++) {
            for (let x = 0; x < C.GRID_WIDTH; x++) {
                const tile = newGrid[y][x];
                if(tile.type === TileType.EMPTY && Math.random() < C.TREE_REGROWTH_CHANCE) {
                    tile.type = TileType.SAPLING;
                    tile.regrowthTicks = 0;
                    gridChanged = true;
                } else if (tile.type === TileType.SAPLING) {
                    tile.regrowthTicks = (tile.regrowthTicks || 0) + 1;
                    if(tile.regrowthTicks >= C.SAPLING_TO_TREE_TICKS) {
                        tile.type = TileType.TREE;
                        tile.regrowthTicks = 0;
                        gridChanged = true;
                    }
                }
            }
        }

        let mineralsThisTick = 0, gemsThisTick = 0, logsThisTick = 0, happinessBoostThisTick = false;

        setColonists(prevColonists => {
            const pawnTiles = new Set(prevColonists.map(p=>`${p.x},${p.y}`));
            let workSpeedModifier = activeEvents.some(e => e.id === 'PRODUCTIVITY_BOOST') ? 1.5 : 1;
            if(activeEvents.some(e => e.id === 'MINOR_SETBACK')) workSpeedModifier *= 0.75;
            if(averageHappiness <= C.LOW_MORALE_THRESHOLD) workSpeedModifier *= 0.5;

            let happinessDecay = C.HAPPINESS_DECAY_RATE;
            if(activeEvents.some(e => e.id === 'HIGH_MORALE')) happinessDecay = 0;
            
            let updatedColonists = prevColonists.map((colonist, idx) => {
                let nc = { ...colonist };
                nc.happiness = Math.max(0, nc.happiness - happinessDecay);
                const energyCost = (nc.task === 'MINING' || nc.task === 'BUILDING' || nc.task === 'CHOPPING' || nc.carrying) ? 3 : 1;
                if (nc.task !== 'RESTING' && nc.task !== 'IDLE') nc.energy = Math.max(0, nc.energy - energyCost);
               
                const isonSpecialTile = newGrid[nc.y]?.[nc.x]?.type === TileType.DOOR || newGrid[nc.y]?.[nc.x]?.type === TileType.BED || newGrid[nc.y]?.[nc.x]?.type === TileType.STORAGE;
                if (nc.task === 'IDLE' && isonSpecialTile) {
                    let safeSpot: Point | null = null;
                    for (let r = 1; r < 5 && !safeSpot; r++) {
                        for (let dy = -r; dy <= r; dy++) {
                            for (let dx = -r; dx <= r; dx++) {
                                if (Math.abs(dx) + Math.abs(dy) !== r) continue;
                                const nx = nc.x + dx;
                                const ny = nc.y + dy;
                                const tile = newGrid[ny]?.[nx];
                                if (tile && (tile.type === TileType.FLOOR || tile.type === TileType.EMPTY)) {
                                    if (!pawnTiles.has(`${nx},${ny}`)) {
                                        safeSpot = { x: nx, y: ny };
                                        break;
                                    }
                                }
                            }
                            if (safeSpot) break;
                        }
                    }
                    if (safeSpot) {
                        const path = findPath(nc, safeSpot, newGrid, prevColonists.filter((_, i) => i !== idx));
                        if (path && path.length > 1) {
                            nc.task = 'MOVING_TO_IDLE';
                            nc.path = path.slice(1);
                            return nc; 
                        }
                    }
                }

                if (nc.energy <= C.LOW_ENERGY_THRESHOLD && nc.task !== 'RESTING' && nc.task !== 'MOVING_TO_REST') {
                    let nearestBed: Point | null = null, minBedDist = Infinity;
                    const availableBeds: Point[] = [];
                    for (let y = 0; y < C.GRID_HEIGHT; y++) {
                        for (let x = 0; x < C.GRID_WIDTH; x++) {
                            if (newGrid[y]?.[x]?.type === TileType.BED) {
                                const isOccupied = prevColonists.some(p => p.id !== nc.id && p.x === x && p.y === y);
                                const isTargeted = prevColonists.some(p => p.id !== nc.id && p.target?.x === x && p.target?.y === y && (p.task === 'MOVING_TO_REST' || p.task === 'RESTING'));
                                if (!isOccupied && !isTargeted) {
                                    availableBeds.push({x, y});
                                }
                            }
                        }
                    }
                    if (availableBeds.length > 0) {
                        for(const bed of availableBeds) {
                            const d = distance(nc, bed);
                            if (d < minBedDist) {
                                minBedDist = d;
                                nearestBed = bed;
                            }
                        }
                    }

                    if (nearestBed) {
                        const path = findPath(nc, nearestBed, newGrid, prevColonists.filter((_,i)=>i!==idx));
                        if (path && path.length > 0) { 
                             nc.task = 'MOVING_TO_REST'; 
                             nc.path = path.slice(1); 
                             nc.target = nearestBed;
                             nc.patience = C.COLONIST_PATIENCE; 
                             addLog(`${nc.id} is tired, going to rest.`); 
                             return nc; 
                        }
                    }
                }

                if (nc.task === 'IDLE') {
                    let taskFound = false;
                    
                    const needsBuildingMaterials = newDesignations.flat().some(d => (d === DesignationType.BUILD_WALL && storedLogs < C.WALL_COST) || (d === DesignationType.BUILD_DOOR && storedLogs < C.DOOR_COST) || (d === DesignationType.BUILD_BED && storedLogs < C.BED_COST) || (d === DesignationType.BUILD_STORAGE && storedLogs < C.STORAGE_COST));
                    if (needsBuildingMaterials) {
                         let nearestTree: Point | null = null, minTreeDist = Infinity;
                         for (let y = 0; y < C.GRID_HEIGHT; y++) for (let x = 0; x < C.GRID_WIDTH; x++) {
                            if (newGrid[y][x].type === TileType.TREE) {
                                const d = distance(nc, {x,y});
                                if(d < minTreeDist) {minTreeDist = d; nearestTree = {x,y};}
                            }
                         }
                         if (nearestTree) {
                            const neighbors = [[-1, 0], [1, 0], [0, -1], [0, 1]].map(([dx, dy]) => ({ x: nearestTree!.x + dx, y: nearestTree!.y + dy })).filter(({x, y}) => validTile(newGrid, y, x) && (newGrid[y][x].type === TileType.EMPTY || newGrid[y][x].type === TileType.FLOOR));
                            for(const neighbor of neighbors) {
                                if (pawnTiles.has(`${neighbor.x},${neighbor.y}`)) continue;
                                const path = findPath(nc, neighbor, newGrid, prevColonists.filter((_,i)=>i!==idx));
                                if (path && path.length > 1) { nc.task = `MOVING_TO_CHOP`; nc.target = nearestTree; nc.path = path.slice(1); nc.patience = C.COLONIST_PATIENCE; taskFound = true; addLog(`${nc.id} needs logs, going to chop.`); break; }
                            }
                         }
                    }

                    if (!taskFound) {
                        let nearestTask: {x:number, y:number, type:DesignationType} | null = null, minTaskDist = Infinity;
                        for (let y = 0; y < C.GRID_HEIGHT; y++) for(let x = 0; x < C.GRID_WIDTH; x++) {
                            const des = newDesignations[y][x];
                            if (des) {
                                if((des === DesignationType.BUILD_WALL && storedLogs < C.WALL_COST) || (des === DesignationType.BUILD_DOOR && storedLogs < C.DOOR_COST) || (des === DesignationType.BUILD_BED && storedLogs < C.BED_COST) || (des === DesignationType.BUILD_STORAGE && storedLogs < C.STORAGE_COST)) continue;

                                const d = distance(nc, {x, y});
                                if (d < minTaskDist && isTileDesignatable(newGrid[y][x].type, des)) {
                                    minTaskDist = d;
                                    nearestTask = {x, y, type: des};
                                }
                            }
                        }

                        if (nearestTask) {
                            const targetDesignation = nearestTask.type;
                            if (targetDesignation === DesignationType.MINE || targetDesignation === DesignationType.CHOP) {
                                const taskName = targetDesignation === DesignationType.MINE ? 'MINE' : 'CHOP';
                                const neighbors = [[-1, 0], [1, 0], [0, -1], [0, 1]].map(([dx, dy]) => ({ x: nearestTask!.x + dx, y: nearestTask!.y + dy })).filter(({x, y}) => validTile(newGrid, y, x) && (newGrid[y][x].type === TileType.EMPTY || newGrid[y][x].type === TileType.FLOOR || newGrid[y][x].type === TileType.DOOR));
                                for(const neighbor of neighbors) {
                                    if (pawnTiles.has(`${neighbor.x},${neighbor.y}`)) continue;
                                    const path = findPath(nc, neighbor, newGrid, prevColonists.filter((_,i)=>i!==idx));
                                    if (path && path.length > 1) { nc.task = `MOVING_TO_${taskName}`; nc.target = nearestTask; nc.path = path.slice(1); nc.patience = C.COLONIST_PATIENCE; taskFound = true; addLog(`${nc.id} is going to ${taskName.toLowerCase()} at (${nc.target.x}, ${nc.target.y}).`); break; }
                                }
                            } else if (targetDesignation.startsWith('BUILD')) {
                                const path = findPath(nc, nearestTask, newGrid, prevColonists.filter((_,i)=>i!==idx));
                                 if (path && path.length > 1) {
                                    nc.task = 'MOVING_TO_BUILD'; nc.target = nearestTask; nc.path = path.slice(1); nc.patience = C.COLONIST_PATIENCE; taskFound = true; addLog(`${nc.id} is going to build at (${nc.target.x}, ${nc.target.y}).`);
                                }
                            }
                        }
                    }
                    
                    if (!taskFound) {
                        let nearestDropped: Point | null = null, minDroppedDist = Infinity;
                        for (let y = 0; y < C.GRID_HEIGHT; y++) for (let x = 0; x < C.GRID_WIDTH; x++) {
                             const tileType = newGrid[y]?.[x]?.type;
                             if (tileType === TileType.DROPPED_MINERAL || tileType === TileType.DROPPED_GEM || tileType === TileType.DROPPED_LOG) {
                                const d = distance(nc, { x, y });
                                if (d < minDroppedDist) { minDroppedDist = d; nearestDropped = { x, y }; }
                             }
                        }
                        if (nearestDropped) {
                            const path = findPath(nc, nearestDropped, newGrid, prevColonists.filter((_,i)=>i!==idx));
                            if(path && path.length > 1) { nc.task = 'MOVING_TO_HAUL'; nc.target = nearestDropped; nc.path = path.slice(1); nc.patience = C.COLONIST_PATIENCE; taskFound = true; addLog(`${nc.id} is going to haul resources.`);}
                        }
                    }

                    if (!taskFound && !needsBuildingMaterials) {
                        let nearestResource: (Point & {type: TileType}) | null = null, minResourceDist = Infinity;
                        const resourcePriority = [TileType.GEM, TileType.MINERAL, TileType.TREE, TileType.ROCK];
                        for (const type of resourcePriority) {
                            for (let y = 0; y < C.GRID_HEIGHT; y++) for (let x = 0; x < C.GRID_WIDTH; x++) {
                                if (newGrid[y][x].type === type) {
                                     const d = distance(nc, { x, y });
                                     if(d < minResourceDist) { minResourceDist = d; nearestResource = {x, y, type}; }
                                }
                            }
                            if(nearestResource) break;
                        }

                        if(nearestResource) {
                             const taskName = nearestResource.type === TileType.TREE ? 'CHOP' : 'MINE';
                             const neighbors = [[-1, 0], [1, 0], [0, -1], [0, 1]].map(([dx, dy]) => ({ x: nearestResource!.x + dx, y: nearestResource!.y + dy })).filter(({x, y}) => validTile(newGrid, y, x) && (newGrid[y][x].type === TileType.EMPTY || newGrid[y][x].type === TileType.FLOOR));
                             for(const neighbor of neighbors) {
                                if (pawnTiles.has(`${neighbor.x},${neighbor.y}`)) continue;
                                const path = findPath(nc, neighbor, newGrid, prevColonists.filter((_,i)=>i!==idx));
                                if (path && path.length > 1) { nc.task = `MOVING_TO_${taskName}`; nc.target = nearestResource; nc.path = path.slice(1); nc.patience = C.COLONIST_PATIENCE; taskFound = true; addLog(`${nc.id} starting exploratory ${taskName.toLowerCase()}.`); break; }
                            }
                        }
                    }
                }

                if (nc.task.startsWith('MOVING_')) {
                    if (nc.path.length > 0) {
                        const nextStep = nc.path.shift() as Point;
                        if (prevColonists.some((p,i2)=>i2!==idx && p.x===nextStep.x && p.y===nextStep.y)) {
                            nc.path.unshift(nextStep); 
                            nc.patience = (nc.patience || C.COLONIST_PATIENCE) - 1;
                            if (nc.patience <= 0) {
                                nc.task = 'IDLE'; nc.path = []; nc.target = null;
                                addLog(`${nc.id} is stuck and is reconsidering their life choices.`);
                            }
                        } else {
                            nc.x = nextStep.x; nc.y = nextStep.y;
                            nc.patience = C.COLONIST_PATIENCE;
                        }
                    } else {
                        if(nc.task === 'MOVING_TO_IDLE') { nc.task = 'IDLE'; }
                        else if(nc.task === 'MOVING_TO_MINE') { nc.task = 'MINING'; }
                        else if(nc.task === 'MOVING_TO_CHOP') { nc.task = 'CHOPPING'; }
                        else if(nc.task === 'MOVING_TO_BUILD') { nc.task = 'BUILDING'; }
                        else if(nc.task === 'MOVING_TO_HAUL') {
                            const currentTile = newGrid[nc.y]?.[nc.x];
                            if (currentTile) {
                                if (currentTile.type === TileType.DROPPED_MINERAL) nc.carrying = TileType.MINERAL;
                                else if (currentTile.type === TileType.DROPPED_GEM) nc.carrying = TileType.GEM;
                                else if (currentTile.type === TileType.DROPPED_LOG) nc.carrying = 'LOGS';
                                currentTile.type = TileType.FLOOR; 
                                gridChanged = true;
                            }
                            let nearestStorage: Point | null = null, minStorageDist = Infinity;
                            for (let y = 0; y < C.GRID_HEIGHT; y++) for (let x = 0; x < C.GRID_WIDTH; x++) if(newGrid[y]?.[x]?.type === TileType.STORAGE) { const d = distance(nc, {x, y}); if(d < minStorageDist) { minStorageDist = d; nearestStorage = {x, y}; } }
                            if(nearestStorage) {
                                const path = findPath(nc, nearestStorage, newGrid, prevColonists.filter((_,i)=>i!==idx));
                                if(path && path.length > 1) { nc.task = 'MOVING_TO_STORAGE'; nc.path = path.slice(1); nc.patience = C.COLONIST_PATIENCE; } else { nc.task = 'IDLE'; }
                            } else { nc.task = 'IDLE'; }
                        }
                        else if(nc.task === 'MOVING_TO_STORAGE') {
                            if (nc.carrying === TileType.MINERAL) mineralsThisTick++;
                            else if (nc.carrying === TileType.GEM) gemsThisTick++;
                            else if (nc.carrying === 'LOGS') logsThisTick++;
                            addLog(`${nc.id} stored a resource.`);
                            nc.carrying = null; happinessBoostThisTick = true; nc.task = 'IDLE';
                        }
                        else if(nc.task === 'MOVING_TO_REST') nc.task = 'RESTING';
                    }
                }

                if (nc.task === 'MINING' || nc.task === 'CHOPPING' || nc.task === 'BUILDING') {
                    if (!nc.target) { nc.task = 'IDLE'; return nc; }
                    const requiredDuration = nc.task === 'MINING' ? C.MINING_DURATION : nc.task === 'CHOPPING' ? C.CHOPPING_DURATION : C.BUILD_DURATION;
                    nc.workTicks += workSpeedModifier;
                    if (nc.workTicks >= requiredDuration) {
                        const {x, y} = nc.target;
                        const targetTile = newGrid[y]?.[x];
                        const targetDesignation = newDesignations[y]?.[x];
                        if (targetTile) {
                             if(nc.task === 'MINING') {
                                addLog(`${nc.id} finished mining at (${x}, ${y}).`);
                                if (targetTile.type === TileType.MINERAL) targetTile.type = TileType.DROPPED_MINERAL;
                                else if (targetTile.type === TileType.GEM) targetTile.type = TileType.DROPPED_GEM;
                                else targetTile.type = TileType.EMPTY;
                            } else if (nc.task === 'CHOPPING') {
                                addLog(`${nc.id} finished chopping at (${x}, ${y}).`);
                                targetTile.type = TileType.DROPPED_LOG;
                            } else if (nc.task === 'BUILDING') {
                                if(targetDesignation === DesignationType.BUILD_FLOOR) {
                                    addLog(`${nc.id} finished building floor at (${x}, ${y}).`, 'event');
                                    targetTile.type = TileType.FLOOR;
                                } else if (targetDesignation === DesignationType.BUILD_WALL) {
                                    addLog(`${nc.id} finished building wall at (${x}, ${y}).`, 'event');
                                    targetTile.type = TileType.WALL;
                                    logsThisTick -= C.WALL_COST;
                                } else if (targetDesignation === DesignationType.BUILD_DOOR) {
                                    addLog(`${nc.id} finished building door at (${x}, ${y}).`, 'event');
                                    targetTile.type = TileType.DOOR;
                                    logsThisTick -= C.DOOR_COST;
                                } else if (targetDesignation === DesignationType.BUILD_BED) {
                                     addLog(`${nc.id} finished building bed at (${x}, ${y}).`, 'event');
                                     targetTile.type = TileType.BED;
                                     logsThisTick -= C.BED_COST;
                                } else if (targetDesignation === DesignationType.BUILD_STORAGE) {
                                     addLog(`${nc.id} finished building storage at (${x}, ${y}).`, 'event');
                                     targetTile.type = TileType.STORAGE;
                                     logsThisTick -= C.STORAGE_COST;
                                }
                            }
                            gridChanged = true;
                        }
                        if (validTile(newDesignations, y, x)) { newDesignations[y][x] = null; }
                        nc.task = 'IDLE'; nc.workTicks = 0; nc.target = null;
                    }
                }
                if (nc.task === 'RESTING') { if (nc.energy >= C.MAX_ENERGY) { nc.energy = C.MAX_ENERGY; nc.task = 'IDLE'; addLog(`${nc.id} is fully rested.`); } else { nc.energy += 10; } }
                
                return nc;
            });
            
            const newTotalMinerals = storedMinerals + mineralsThisTick;
            const newTotalGems = storedGems + gemsThisTick;

            if (mineralsThisTick > 0) setStoredMinerals(newTotalMinerals);
            if (gemsThisTick > 0) setStoredGems(newTotalGems);
            if (logsThisTick !== 0) setStoredLogs(prev => Math.max(0, prev + logsThisTick));

            recordColonistWorkLog(updatedColonists, tickCount);

            let finalColonists = updatedColonists;
            if (happinessBoostThisTick) {
                finalColonists = updatedColonists.map(c => ({ ...c, happiness: Math.min(C.MAX_HAPPINESS, c.happiness + C.HAPPINESS_BOOST_ON_STORE) }));
            }
            let totalHappiness = finalColonists.reduce((sum, c) => sum + c.happiness, 0);

            if (newTotalMinerals >= currentGoal) {
                const newLevel = milestoneLevel + 1;
                setMilestoneLevel(newLevel);
                setCurrentGoal(C.INITIAL_GOAL + newLevel * C.GOAL_INCREMENT);
                addLog(`MILESTONE REACHED! Next goal: ${C.INITIAL_GOAL + newLevel * C.GOAL_INCREMENT} minerals.`, "event");
            }

            if (gridChanged) setGrid(newGrid);
            setDesignations(newDesignations);
            setAverageHappiness(totalHappiness / (finalColonists.length || 1));
            if (selectedColonist && !finalColonists.find(c => c.id === selectedColonist.id)) {
                setSelectedColonist(null);
            } else if (selectedColonist) {
                 const updatedSelected = finalColonists.find(c => c.id === selectedColonist.id);
                 setSelectedColonist(updatedSelected || null);
            }
            return finalColonists;
        });
    }, [grid, designations, averageHappiness, selectedColonist, storedMinerals, storedGems, storedLogs, recordColonistWorkLog, tickCount, milestoneLevel, currentGoal, activeEvents, colonists.length, addLog]);

    useEffect(() => { if (!isPlaying || !grid || showIntro || eventPopup) return; const intervalId = setInterval(gameTick, C.GAME_TICK_MS); return () => clearInterval(intervalId); }, [isPlaying, grid, gameTick, showIntro, eventPopup]);

    useEffect(() => {
        if (!grid || !canvasRef.current) return;
        const canvas = canvasRef.current; const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = isDay ? C.PALETTE.BACKGROUND : C.PALETTE.NIGHT;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = `${C.TILE_SIZE * 0.9}px "Courier New", monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        
        for (let y = 0; y < C.GRID_HEIGHT; y++) for (let x = 0; x < C.GRID_WIDTH; x++) {
            const tile = grid[y]?.[x];
            if (tile) {
                const drawX = x * C.TILE_SIZE + C.TILE_SIZE / 2, drawY = y * C.TILE_SIZE + C.TILE_SIZE / 2;
                if(tile.type === TileType.FLOOR) { ctx.fillStyle = C.PALETTE.FLOOR; ctx.fillText(C.CHARS.FLOOR, drawX, drawY); }
                else if (tile.type === TileType.BED || tile.type === TileType.STORAGE) {
                    ctx.fillStyle = C.PALETTE.FLOOR; ctx.fillText(C.CHARS.FLOOR, drawX, drawY);
                }
            }
        }
        
        for (let y = 0; y < C.GRID_HEIGHT; y++) for (let x = 0; x < C.GRID_WIDTH; x++) {
            const tile = grid[y]?.[x];
            if (tile) {
                const drawX = x * C.TILE_SIZE + C.TILE_SIZE / 2, drawY = y * C.TILE_SIZE + C.TILE_SIZE / 2;
                let charToDraw = null; let color = '';
                switch (tile.type) {
                    case TileType.ROCK: color = isDay ? C.PALETTE.ROCK : "#253042"; charToDraw = C.CHARS.ROCK; break;
                    case TileType.MINERAL: color = isDay ? C.PALETTE.MINERAL : "#b0ad3e"; charToDraw = C.CHARS.MINERAL; break;
                    case TileType.GEM: color = isDay ? C.PALETTE.GEM : "#7c3aed"; charToDraw = C.CHARS.GEM; break;
                    case TileType.STORAGE: color = C.PALETTE.STORAGE; charToDraw = C.CHARS.STORAGE; break;
                    case TileType.DROPPED_MINERAL: color = C.PALETTE.DROPPED_MINERAL; charToDraw = C.CHARS.DROPPED_MINERAL; break;
                    case TileType.DROPPED_GEM: color = C.PALETTE.DROPPED_GEM; charToDraw = C.CHARS.DROPPED_GEM; break;
                    case TileType.BED: color = C.PALETTE.BED; charToDraw = C.CHARS.BED; break;
                    case TileType.TREE: color = isDay ? C.PALETTE.TREE : "#166534"; charToDraw = C.CHARS.TREE; break;
                    case TileType.DROPPED_LOG: color = C.PALETTE.DROPPED_LOG; charToDraw = C.CHARS.DROPPED_LOG; break;
                    case TileType.WALL: color = C.PALETTE.WALL; charToDraw = C.CHARS.WALL; break;
                    case TileType.DOOR: color = C.PALETTE.DOOR; charToDraw = C.CHARS.DOOR; break;
                    case TileType.SAPLING: color = C.PALETTE.SAPLING; charToDraw = C.CHARS.SAPLING; break;
                }
                if (charToDraw) { ctx.fillStyle = color; ctx.fillText(charToDraw, drawX, drawY); }
            }
        }
        if (designations) for (let y = 0; y < C.GRID_HEIGHT; y++) for (let x = 0; x < C.GRID_WIDTH; x++) {
            const des = designations[y]?.[x];
            if (des) {
                if (des === DesignationType.MINE || des === DesignationType.CHOP || des === DesignationType.HARVEST) ctx.fillStyle = C.PALETTE.DESIGNATION_MINE;
                else if (des.startsWith('BUILD')) ctx.fillStyle = C.PALETTE.DESIGNATION_BUILD;
                ctx.fillRect(x * C.TILE_SIZE, y * C.TILE_SIZE, C.TILE_SIZE, C.TILE_SIZE);
            }
        }

        colonists.forEach(c => {
            const drawX = c.x * C.TILE_SIZE + C.TILE_SIZE / 2, drawY = c.y * C.TILE_SIZE + C.TILE_SIZE / 2;
            ctx.fillStyle = (selectedColonist && c.id === selectedColonist.id) ? C.PALETTE.COLONIST_SELECTED : C.PALETTE.COLONIST;
            let char = C.CHARS.COLONIST;
            if(c.task === 'MINING' || c.task === 'BUILDING' || c.task === 'CHOPPING') char = C.CHARS.COLONIST_WORKING; if(c.carrying) char = C.CHARS.COLONIST_HAULING; if(c.task === 'RESTING') char = C.CHARS.COLONIST_RESTING;
            ctx.fillText(char, drawX, drawY);
        });
    }, [grid, colonists, selectedColonist, designations, isDay]);

    const getGridCoordsFromEvent = (event: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent): Point | null => {
        const canvas = canvasRef.current; if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in event ? (event as TouchEvent).touches[0].clientX : (event as MouseEvent).clientX;
        const clientY = 'touches' in event ? (event as TouchEvent).touches[0].clientY : (event as MouseEvent).clientY;
        const x = clientX - rect.left, y = clientY - rect.top;
        return { x: Math.floor(x / C.TILE_SIZE), y: Math.floor(y / C.TILE_SIZE) };
    };

    const handleCanvasMouseDown = (event: React.MouseEvent) => {
        if (!grid || !designations) return;
        const coords = getGridCoordsFromEvent(event); if (!coords) return;
        if (interactionMode === 'INSPECT') {
            const clickedColonist = colonists.find(c => c.x === coords.x && c.y === coords.y);
            setSelectedColonist(clickedColonist || null);
        } else if (interactionMode === 'DESIGNATE' && designationType) {
            isDesignating.current = true;
            designationStart.current = coords;
            designationDragStart.current = designations.map(r => [...r]);
            setDesignations(prev => {
                if (!prev) return prev;
                const newD = prev.map(r => [...r]);
                if (!validTile(grid, coords.y, coords.x)) return newD;
                
                let desType = designationType;
                 if(designationType === DesignationType.HARVEST) {
                    const tileType = grid[coords.y][coords.x].type;
                    if(tileType === TileType.TREE) desType = DesignationType.CHOP;
                    else desType = DesignationType.MINE;
                }
                
                if (isTileDesignatable(grid[coords.y][coords.x].type, desType))
                    newD[coords.y][coords.x] = newD[coords.y][coords.x] === desType ? null : desType;
                return newD;
            });
        }
    };

    const handleCanvasMouseMove = (event: React.MouseEvent) => {
        if (!grid || !designations) return;
        const coords = getGridCoordsFromEvent(event);
        if(coords && validTile(grid, coords.y, coords.x)) {
            setHoveredTile({ ...coords, ...grid[coords.y][coords.x] });
        } else { setHoveredTile(null); }
        if (interactionMode === 'DESIGNATE' && isDesignating.current && designationStart.current && coords) {
            setDesignations(prev => {
                if (!prev || !designationDragStart.current || !designationType) return prev;
                const newD = designationDragStart.current.map(r => [...r]);
                const start = designationStart.current as Point;
                const end = coords;
                const x0 = Math.min(start.x, end.x), x1 = Math.max(start.x, end.x);
                const y0 = Math.min(start.y, end.y), y1 = Math.max(start.y, end.y);

                const isHollow = designationType === DesignationType.BUILD_WALL || designationType === DesignationType.BUILD_DOOR;

                for (let y = y0; y <= y1; y++) {
                    for (let x = x0; x <= x1; x++) {
                        if (isHollow && (y > y0 && y < y1 && x > x0 && x < x1)) continue;

                        let desType = designationType;
                        if (designationType === DesignationType.HARVEST) {
                             if(validTile(grid, y, x)){
                                const tileType = grid[y][x].type;
                                if(tileType === TileType.TREE) desType = DesignationType.CHOP;
                                else desType = DesignationType.MINE;
                             } else { continue; }
                        }
                        if (desType && validTile(grid, y, x) && isTileDesignatable(grid[y][x].type, desType))
                            newD[y][x] = desType;
                    }
                }
                return newD;
            });
        }
    };

    const handleCanvasMouseUp = () => { isDesignating.current = false; designationStart.current = null; designationDragStart.current = null; };
    const handleSetDesignation = (type: DesignationType) => { 
        setDesignationType(type); 
        setInteractionMode('DESIGNATE');
        if(type === DesignationType.HARVEST) setCursor('pickaxe');
        else setCursor('default');
    };
    const handleSetInspect = () => {
        setInteractionMode('INSPECT');
        setDesignationType(null);
        setCursor('default');
    }
    
    const closeEventPopup = () => {
        const event = eventPopup;
        if (!event) {
            setIsPlaying(true);
            return;
        };

        if (event.id === 'NEW_COLONIST') {
            setColonists(prev => {
                const newId = `Colonist-${prev.length + 1}`;
                const startX = Math.floor(C.GRID_WIDTH / 2), startY = Math.floor(C.GRID_HEIGHT / 2);
                return [...prev, {id: newId, x: startX, y: startY, task: 'IDLE', target: null, path: [], workTicks: 0, carrying: null, energy: C.MAX_ENERGY, happiness: C.MAX_HAPPINESS, patience: C.COLONIST_PATIENCE }]
            });
             setColonistLogs(prev => [...prev, Array(C.DAY_LENGTH_TICKS).fill(null)]);
        } else if (event.id === 'TRAGIC_ACCIDENT') {
            // FIX: Use functional state updates to prevent using stale state when determining the victim.
            setColonists(prevColonists => {
                if (prevColonists.length <= 1) {
                    addLog("A tragic accident was narrowly avoided.", "event");
                    return prevColonists;
                }
                const victimIndex = Math.floor(Math.random() * prevColonists.length);
                const victim = prevColonists[victimIndex];
                addLog(`${victim.id} has died in a tragic accident.`, 'event');
                setColonistLogs(prevLogs => prevLogs.filter((_, i) => i !== victimIndex));
                return prevColonists.filter((_, i) => i !== victimIndex);
            });
        } else {
             setActiveEvents(prev => [...prev.filter(e => e.id !== event.id), event]);
        }
        setEventPopup(null);
        setIsPlaying(true);
    };

    const handleUnstuck = () => {
        if (!grid) return;
        const newGrid = grid.map(r => r.map(c => ({...c})));
        let gridChanged = false;
    
        const updatedColonists = colonists.map(c => {
            // FIX: Make unstuck more reliable by allowing items to be dropped on more tile types and adding a validity check.
            if (c.carrying && validTile(newGrid, c.y, c.x) && [TileType.EMPTY, TileType.FLOOR, TileType.DOOR, TileType.SAPLING].includes(newGrid[c.y][c.x].type)) {
                let dropType: TileType | null = null;
                if (c.carrying === TileType.MINERAL) dropType = TileType.DROPPED_MINERAL;
                else if (c.carrying === TileType.GEM) dropType = TileType.DROPPED_GEM;
                else if (c.carrying === 'LOGS') dropType = TileType.DROPPED_LOG;
    
                if (dropType) {
                     newGrid[c.y][c.x].type = dropType;
                     gridChanged = true;
                }
            }
            return {
                ...c,
                task: 'IDLE',
                target: null,
                path: [],
                workTicks: 0,
                patience: C.COLONIST_PATIENCE,
                carrying: null,
                energy: Math.max(c.energy, C.LOW_ENERGY_THRESHOLD + 1)
            };
        });
        
        setColonists(updatedColonists);
        if(gridChanged) {
            setGrid(newGrid);
        }
        addLog('All colonists have been forcefully reset.', 'event');
    };

    return (
        <div className="bg-gray-900 min-h-screen flex flex-col items-center justify-center font-mono p-4 text-white">
            {showIntro && <IntroModal onStart={() => {setShowIntro(false); setIsPlaying(true);}}/>}
            <div className="w-full max-w-[1400px] mx-auto flex flex-col items-center">
                <h1 className="text-3xl font-bold mb-2">[PROJECT ASTEROID] <span className="text-sm font-normal ml-3">{C.GAME_VERSION}</span></h1>
                
                <div className="w-full flex flex-wrap justify-center items-start gap-4 mb-4">
                    <div className="flex flex-col gap-4" style={{minWidth: '280px'}}>
                       <CombinedInspectorPanel colonist={selectedColonist} tile={hoveredTile} />
                        <ColonistQuickSelectPanel colonists={colonists} onSelect={setSelectedColonist} selectedId={selectedColonist?.id} />
                    </div>
                    <div className="flex flex-col gap-4 flex-grow" style={{minWidth: '300px'}}>
                        <StatsPanel storedMinerals={storedMinerals} storedGems={storedGems} storedLogs={storedLogs} averageHappiness={averageHappiness} workEfficiency={workEfficiency} currentDay={currentDay} currentHour={currentHour} isDay={isDay} milestoneLevel={milestoneLevel} currentGoal={currentGoal}/>
                        <EventsPanel events={activeEvents}/>
                        <BuildMenu onSetDesignation={handleSetDesignation} onSetInspect={handleSetInspect} currentMode={interactionMode} designationType={designationType} storedLogs={storedLogs} />
                    </div>
                    <div className="flex flex-col gap-4" style={{minWidth: '450px'}}>
                        <GameLogPanel log={gameLog} />
                        <ColonistWorkLogPanel colonists={colonists} logs={colonistLogs} tickCount={tickCount} />
                    </div>
                </div>

                <div className="border-2 border-gray-600 shadow-lg relative">
                    <canvas ref={canvasRef} style={{ cursor: cursor === 'pickaxe' ? `url(${C.PICKAXE_CURSOR_SVG}), auto` : 'default' }} width={C.GRID_WIDTH * C.TILE_SIZE} height={C.GRID_HEIGHT * C.TILE_SIZE} onMouseDown={handleCanvasMouseDown} onMouseMove={handleCanvasMouseMove} onMouseUp={handleCanvasMouseUp} onMouseLeave={handleCanvasMouseUp} />
                    {eventPopup && <EventModal event={eventPopup} onContinue={closeEventPopup} />}
                </div>

                <div className="flex items-center space-x-4 mt-4">
                    <button onClick={() => setIsPlaying(!isPlaying)} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-lg font-semibold disabled:bg-gray-500 disabled:cursor-not-allowed"> {isPlaying ? 'Pause' : 'Play'} </button>
                    <div className="flex items-center gap-2">
                        <button onClick={resetGame} className="px-6 py-2 bg-gray-600 hover:bg-gray-700 rounded-md text-lg font-semibold"> Regenerate World </button>
                        <input type="text" value={seed} onChange={(e) => setSeed(e.target.value)} className="bg-gray-700 border border-gray-500 rounded px-2 py-1 w-32" placeholder="seed..."/>
                    </div>
                     <button onClick={handleUnstuck} className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-md text-md font-semibold">Unstuck Colonists</button>
                    <div className="relative">
                        <button onClick={() => setShowSettings(s => !s)} className="p-2 bg-gray-600 hover:bg-gray-700 rounded-md">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 0 2.4l-.15.08a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1 0-2.4l.15-.08a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                        {showSettings && <SettingsModal onExport={handleExportJson} onImport={handleImportJson} importError={importError} setImportError={setImportError} />}
                    </div>
                </div>
                 <Legend />
            </div>
        </div>
    );
}
