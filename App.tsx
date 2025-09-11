

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { Colonist, ColonistLog, Designations, DesignationType, GameEvent, GameLogItem, Grid, InteractionMode, Point, Tile, TileType, ChronologyEntry } from './types';
import * as C from './constants';
import { distance } from './utils/geometry';
import { createPRNG, createNoise2D } from './utils/noise';
import { findPath } from './utils/pathfinding';
import { initialStoryFallbacks, chronologyPlaceholders } from './utils/fallbackData';

import { IntroModal } from './components/IntroModal';
import { StatsPanel } from './components/StatsPanel';
import { EventModal } from './components/EventModal';
import { SettingsModal } from './components/SettingsModal';
import { Legend } from './components/Legend';
import { CombinedInspectorPanel } from './components/CombinedInspectorPanel';
import { BuildMenu } from './components/BuildMenu';
import { GameLogPanel } from './components/GameLogPanel';
import { ColonistWorkLogPanel } from './components/ColonistWorkLogPanel';
import { ColonyChronologyPanel } from './components/ColonyChronologyPanel';

const generateInitialStory = async (): Promise<{ colonyName: string; asteroidName: string; firstEntry: string; colonists: { name: string; backstory: string }[] }> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    const prompt = `Generate a unique sci-fi colony simulation starting scenario. The theme is a small human contingent deployed from an AI-overseen interstellar ark onto a rocky, asteroid-like comet (a 'manx' comet) that has been traveling for eons. Provide the following in JSON format:
    - colonyName: A unique, evocative name for the colony.
    - asteroidName: A sci-fi designation for the interstellar object, hinting at its nature.
    - firstEntry: A short, narrative log entry for the "Colony Chronology". This should be from the perspective of the paternalistic, slightly detached AI overseer observing its simulation trial. It should set the scene, mentioning the protocol and the objective.
    - colonists: An array of exactly 3 colonists, each with a unique, non-tropey sci-fi 'name' and a short, one-sentence 'backstory' hinting at their past skills or personality. It is crucial to AVOID using generic or common sci-fi names. Do not use names from the following negative list under any circumstances: Kael, Kai, Elara, Lyra, Jian, Thorne, Vance. Create original, less common names that feel authentic to a far-future setting.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        colonyName: { type: Type.STRING },
                        asteroidName: { type: Type.STRING },
                        firstEntry: { type: Type.STRING },
                        colonists: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING },
                                    backstory: { type: Type.STRING },
                                }
                            }
                        }
                    }
                }
            }
        });
        
        const jsonText = response.text.trim();
        const parsed = JSON.parse(jsonText);
        
        if (parsed.colonists && parsed.colonists.length === 3) {
            return parsed;
        } else {
             throw new Error("Invalid number of colonists returned from AI.");
        }

    } catch (error) {
        console.error("Error generating story from Gemini, falling back to default:", error);
        return initialStoryFallbacks[Math.floor(Math.random() * initialStoryFallbacks.length)];
    }
};


export default function App() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [grid, setGrid] = useState<Grid | null>(null);
    const [designations, setDesignations] = useState<Designations | null>(null);
    const [colonists, setColonists] = useState<Colonist[]>([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [showIntro, setShowIntro] = useState(true);
    const [storedMinerals, setStoredMinerals] = useState(0);
    const [storedGems, setStoredGems] = useState(0);
    const [storedLogs, setStoredLogs] = useState(15);
    const [storedStone, setStoredStone] = useState(0);
    const [storedFood, setStoredFood] = useState(10);
    const [selectedColonist, setSelectedColonist] = useState<Colonist | null>(null);
    const [hoveredTile, setHoveredTile] = useState<Tile | null>(null);
    const [averageHappiness, setAverageHappiness] = useState(C.MAX_HAPPINESS);
    const [workEfficiency, setWorkEfficiency] = useState(100);
    const [milestoneLevel, setMilestoneLevel] = useState(0);
    const [currentGoal, setCurrentGoal] = useState(C.INITIAL_GOAL);
    const [activeEvents, setActiveEvents] = useState<GameEvent[]>([]);
    const [eventPopup, setEventPopup] = useState<GameEvent | null>(null);
    const [gameLog, setGameLog] = useState<GameLogItem[]>([]);
    const [gameTime, setGameTime] = useState(0);
    const [interactionMode, setInteractionMode] = useState<InteractionMode>('INSPECT');
    const [designationType, setDesignationType] = useState<DesignationType | null>(null);
    const [importError, setImportError] = useState("");
    const [tickCount, setTickCount] = useState(0);
    const [currentDay, setCurrentDay] = useState(1);
    const [currentHour, setCurrentHour] = useState(6);
    const [seed, setSeed] = useState(Date.now().toString().slice(-4));
    const [showSettings, setShowSettings] = useState(false);
    const [cursor, setCursor] = useState('default');
    
    const [isGenerating, setIsGenerating] = useState(true);
    const [colonyName, setColonyName] = useState("");
    const [asteroidName, setAsteroidName] = useState("");
    const [chronology, setChronology] = useState<ChronologyEntry[]>([]);
    const [isNarrating, setIsNarrating] = useState(false);
    const [expandedPanel, setExpandedPanel] = useState<'chronology' | 'log' | 'none'>('chronology');
    const [apiFailed, setApiFailed] = useState(false);
    
    const [unstuckPressCount, setUnstuckPressCount] = useState(0);
    const unstuckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const [colonistLogs, setColonistLogs] = useState<ColonistLog[]>([]);

    const isDesignating = useRef(false);
    const designationStart = useRef<Point | null>(null);
    const designationDragStart = useRef<Designations | null>(null);

    const isDay = (currentHour >= 7 && currentHour < 19);

    const addLog = useCallback((message: string, type: 'standard' | 'event' = 'standard') => {
        const time = new Date();
        const timestamp = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}:${time.getSeconds().toString().padStart(2, '0')}`;
        setGameLog(prevLog => [{msg: `[${timestamp}] ${message}`, type}, ...prevLog].slice(0, 100));
    }, []);
    
    const addChronologyEntry = useCallback((message: string) => {
        const timestamp = `Day ${currentDay}, ${String(currentHour).padStart(2, '0')}:00`;
        setChronology(prev => [...prev, { timestamp, message }]);
    }, [currentDay, currentHour]);

    const validTile = (arr: any[][], y: number, x: number) => arr && arr[y] && arr[y][x] !== undefined;

    const isTileDesignatable = (tileType: TileType, designationType: DesignationType): boolean => {
        switch (designationType) {
            case DesignationType.MINE:
                return [TileType.ROCK, TileType.MINERAL, TileType.GEM].includes(tileType);
            case DesignationType.CHOP:
                return tileType === TileType.TREE;
            case DesignationType.HARVEST: // This is a meta-type in the UI that can mean mine or chop
                return [TileType.ROCK, TileType.MINERAL, TileType.GEM, TileType.TREE].includes(tileType);
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
            case DesignationType.UPGRADE_TO_STONE_FLOOR:
                return tileType === TileType.WOOD_FLOOR;
            case DesignationType.UPGRADE_TO_STONE_WALL:
                return tileType === TileType.WOOD_WALL;
            default:
                return false;
        }
    };

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

    const summarizeGameState = useCallback(() => {
        const happinessStatus = averageHappiness > 70 ? "high" : averageHappiness > 40 ? "stable" : "low";
        const resourceStatus = (storedMinerals < 10 && storedLogs < 10) ? "critically low" : "stable";
        
        let recentActions: { [key: string]: number } = {};
        colonists.forEach((c, idx) => {
            const log = colonistLogs[idx];
            if (!log) return;
            const recentTicks = log.slice(Math.max(0, tickCount - 50), tickCount);
            recentTicks.forEach(entry => {
                if (entry) {
                    const genericTask = entry.task.split('_')[0]; // e.g., MOVING_TO_MINE -> MOVING
                    recentActions[genericTask] = (recentActions[genericTask] || 0) + 1;
                }
            });
        });
        
        const dominantActivity = Object.keys(recentActions).length > 0 ? Object.entries(recentActions).reduce((a, b) => a[1] > b[1] ? a : b)[0] : "idling";

        return `Day ${currentDay}, ${String(currentHour).padStart(2, '0')}:00. Morale is ${happinessStatus} (${averageHappiness.toFixed(0)}%). Resources are ${resourceStatus}. The colonists are primarily focused on ${dominantActivity.toLowerCase()}.`;

    }, [averageHappiness, storedMinerals, storedLogs, colonists, colonistLogs, tickCount, currentDay, currentHour]);

    const generateChronicleUpdate = useCallback(async () => {
        if(isNarrating) return;
        setIsNarrating(true);

        const summary = summarizeGameState();
        const prevChronicles = chronology.slice(-4).map(c => `[${c.timestamp}] ${c.message}`).join('\n');

        const prompt = `You are the AI Overseer of Project Asteroid, a simulation trial on an ancient interstellar object. Your tone is paternalistic, clinical, yet with a subtle hint of fascination or disappointment in your human subjects.
        
        PREVIOUS CHRONICLE ENTRIES:
        ${prevChronicles}
        
        CURRENT STATUS:
        ${summary}
        
        Based on the current status and recent events, write the next single, short (1-2 sentences) log entry for the chronicle. Focus on a noteworthy aspect of the current status from your observational perspective. Do not repeat previous entries or the summary verbatim. Your response must be a single JSON object with one key: "newEntry".`;

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                 config: {
                    responseMimeType: "application/json",
                    responseSchema: { type: Type.OBJECT, properties: { newEntry: { type: Type.STRING } } }
                }
            });
            const jsonText = response.text.trim();
            const parsed = JSON.parse(jsonText);
            if(parsed.newEntry) {
                 addChronologyEntry(parsed.newEntry);
            }
        } catch (error) {
            console.error("Failed to generate chronicle update:", error);
            if (!apiFailed) {
                addLog("AI Narrator API limit may be reached. Chronicle will now show placeholder updates. This does not affect gameplay.", "event");
                setApiFailed(true);
            }
            const placeholder = chronologyPlaceholders[Math.floor(Math.random() * chronologyPlaceholders.length)];
            addChronologyEntry(placeholder);
        } finally {
            setIsNarrating(false);
        }

    }, [chronology, summarizeGameState, addChronologyEntry, isNarrating, apiFailed, addLog]);

    const gameTick = useCallback(() => {
        if (!grid || !designations) return;
        const currentTick = tickCount + 1;
        setGameTime(t => t + 1);
        setTickCount(currentTick);

        if ((currentTick % C.DAY_LENGTH_TICKS) === 0) setCurrentDay(day => day + 1);
        setCurrentHour(Math.floor((currentTick % C.DAY_LENGTH_TICKS) / C.TICKS_PER_HOUR));
        
        if (currentTick > 0 && currentTick % 750 === 0 && !isNarrating) {
            generateChronicleUpdate();
        }

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
                } else if (tile.type === TileType.HYDROPONICS_TRAY && tile.growth !== undefined && tile.growth < C.CROP_GROWTH_DURATION) {
                    tile.growth++;
                    gridChanged = true;
                }
            }
        }

        let mineralsThisTick = 0, gemsThisTick = 0, logsThisTick = 0, foodThisTick = 0, stoneThisTick = 0, happinessBoostThisTick = false;

        setColonists(prevColonists => {
            const deathsThisTick: {colonist: Colonist, cause: string}[] = [];
            const pawnTiles = new Set(prevColonists.map(p=>`${p.x},${p.y}`));
            const claimedTargetsThisTick = new Set<string>();
            prevColonists.forEach(p => { if (p.target) { claimedTargetsThisTick.add(`${p.target.x},${p.target.y}`); } });
            
            let workSpeedModifier = activeEvents.some(e => e.id === 'PRODUCTIVITY_BOOST') ? 1.5 : 1;
            if(activeEvents.some(e => e.id === 'MINOR_SETBACK')) workSpeedModifier *= 0.75;
            if(averageHappiness <= C.LOW_MORALE_THRESHOLD) workSpeedModifier *= 0.5;

            let happinessDecay = C.HAPPINESS_DECAY_rate;
            if(activeEvents.some(e => e.id === 'HIGH_MORALE')) happinessDecay = 0;
            
            const dropCarriedItem = (pawn: Colonist) => {
                if (pawn.carrying && validTile(newGrid, pawn.y, pawn.x) && [TileType.EMPTY, TileType.WOOD_FLOOR, TileType.STONE_FLOOR].includes(newGrid[pawn.y][pawn.x].type)) {
                    let dropType: TileType | null = null;
                    if (pawn.carrying === TileType.MINERAL) dropType = TileType.DROPPED_MINERAL;
                    else if (pawn.carrying === TileType.GEM) dropType = TileType.DROPPED_GEM;
                    else if (pawn.carrying === 'LOGS') dropType = TileType.DROPPED_LOG;
                    else if (pawn.carrying === 'FOOD') dropType = TileType.DROPPED_FOOD;
                    else if (pawn.carrying === 'STONE') dropType = TileType.DROPPED_STONE;
                    if (dropType) { newGrid[pawn.y][pawn.x].type = dropType; gridChanged = true; }
                }
            };

            const softReset = (pawn: Colonist) => {
                dropCarriedItem(pawn);
                pawn.task = 'IDLE'; 
                pawn.target = null; 
                pawn.path = []; 
                pawn.workTicks = 0; 
                pawn.patience = C.COLONIST_PATIENCE; 
                pawn.carrying = null;
                pawn.carryingAmount = undefined;
            };

            let updatedColonists = prevColonists.map((colonist, idx) => {
                let nc = { ...colonist };

                // Automatic unstuck logic
                if (nc.lastPosition && nc.x === nc.lastPosition.x && nc.y === nc.lastPosition.y) {
                    nc.stuckTicks = (nc.stuckTicks || 0) + 1;
                } else {
                    nc.stuckTicks = 0;
                }
                nc.lastPosition = { x: nc.x, y: nc.y };

                if (nc.stuckTicks === C.AUTO_UNSTUCK_HARD_TICKS) {
                    addLog(`${nc.name} was severely stuck. Teleporting to safety.`, 'event');
                    const startX = Math.floor(C.GRID_WIDTH / 2);
                    const startY = Math.floor(C.GRID_HEIGHT / 2);
                    dropCarriedItem(nc);
                    nc.x = startX + idx;
                    nc.y = startY + 1;
                    nc.task = 'IDLE'; nc.target = null; nc.path = []; nc.workTicks = 0; nc.patience = C.COLONIST_PATIENCE; nc.carrying = null; nc.energy = C.MAX_ENERGY; nc.hunger = 0; nc.boredom = 0;
                    nc.stuckTicks = 0;
                    return nc;
                } else if (nc.stuckTicks === C.AUTO_UNSTUCK_MEDIUM_TICKS) {
                    addLog(`${nc.name} is still stuck. Trying another reset.`, 'event');
                    softReset(nc);
                } else if (nc.stuckTicks === C.AUTO_UNSTUCK_SOFT_TICKS) {
                    addLog(`${nc.name} has been stuck for a while. Resetting task.`, 'event');
                    softReset(nc);
                }
                
                nc.happiness = Math.max(0, nc.happiness - happinessDecay);
                nc.hunger = Math.min(C.MAX_HUNGER, nc.hunger + C.HUNGER_INCREASE_RATE);
                nc.boredom = Math.min(C.MAX_BOREDOM, nc.boredom + C.BOREDOM_INCREASE_RATE);
                
                const energyCost = (nc.task === 'MINING' || nc.task === 'BUILDING' || nc.task === 'CHOPPING' || nc.carrying) ? 3 : 1;
                if (nc.task !== 'RESTING' && nc.task !== 'IDLE') nc.energy = Math.max(0, nc.energy - energyCost);
               
                if (nc.energy <= C.CRITICAL_ENERGY_THRESHOLD) {
                    nc.criticallyLowEnergyTicks = (nc.criticallyLowEnergyTicks || 0) + 1;
                } else {
                    nc.criticallyLowEnergyTicks = 0;
                }

                if (nc.hunger >= C.CRITICAL_HUNGER_THRESHOLD) {
                    nc.criticallyLowHungerTicks = (nc.criticallyLowHungerTicks || 0) + 1;
                } else {
                    nc.criticallyLowHungerTicks = 0;
                }

                if (nc.criticallyLowEnergyTicks > C.TICKS_TO_DEATH) {
                    deathsThisTick.push({colonist: nc, cause: 'exhaustion'});
                    return nc; // Stop processing this colonist
                }
                if (nc.criticallyLowHungerTicks > C.TICKS_TO_DEATH) {
                    deathsThisTick.push({colonist: nc, cause: 'starvation'});
                    return nc; // Stop processing this colonist
                }

                if (nc.task === 'IDLE' && nc.carrying) {
                    let nearestStorage: Point | null = null, minStorageDist = Infinity;
                    for (let y = 0; y < C.GRID_HEIGHT; y++) for (let x = 0; x < C.GRID_WIDTH; x++) if(newGrid[y]?.[x]?.type === TileType.STORAGE) { const d = distance(nc, {x, y}); if(d < minStorageDist) { minStorageDist = d; nearestStorage = {x, y}; } }
                    if(nearestStorage) { const path = findPath(nc, nearestStorage, newGrid, newDesignations, prevColonists.filter((_,i)=>i!==idx)); if(path && path.length > 1) { nc.task = 'MOVING_TO_STORAGE'; nc.path = path.slice(1); nc.patience = C.COLONIST_PATIENCE; return nc; } }
                }
                
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
                                if (tile && ([TileType.WOOD_FLOOR, TileType.STONE_FLOOR, TileType.EMPTY].includes(tile.type))) {
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
                        const path = findPath(nc, safeSpot, newGrid, newDesignations, prevColonists.filter((_, i) => i !== idx));
                        if (path && path.length > 1) {
                            nc.task = 'MOVING_TO_IDLE';
                            nc.path = path.slice(1);
                            return nc; 
                        }
                    }
                }

                let needsOverride = false;
                if (nc.energy <= C.LOW_ENERGY_THRESHOLD && nc.task !== 'RESTING' && nc.task !== 'MOVING_TO_REST') {
                    let nearestBed: Point | null = null;
                    let minBedDist = Infinity;
                    for (let y = 0; y < C.GRID_HEIGHT; y++) {
                        for (let x = 0; x < C.GRID_WIDTH; x++) {
                            if (newGrid[y]?.[x]?.type === TileType.BED && !claimedTargetsThisTick.has(`${x},${y}`)) {
                                const d = distance(nc, { x, y });
                                if (d < minBedDist) {
                                    minBedDist = d;
                                    nearestBed = { x, y };
                                }
                            }
                        }
                    }
                    if (nearestBed) {
                        const path = findPath(nc, nearestBed, newGrid, newDesignations, prevColonists.filter((_,i)=>i!==idx));
                        if (path && path.length > 0) {
                            nc.task = 'MOVING_TO_REST'; nc.path = path.slice(1); nc.target = nearestBed; nc.patience = C.COLONIST_PATIENCE;
                            addLog(`${nc.name} is tired, going to rest.`);
                            claimedTargetsThisTick.add(`${nearestBed.x},${nearestBed.y}`);
                            needsOverride = true;
                        }
                    }
                }
                if (!needsOverride && nc.hunger >= C.LOW_HUNGER_THRESHOLD && nc.task !== 'EATING' && nc.task !== 'MOVING_TO_EAT') {
                    if (storedFood > 0) {
                        let nearestStorage: Point | null = null, minStorageDist = Infinity;
                        for (let y = 0; y < C.GRID_HEIGHT; y++) for (let x = 0; x < C.GRID_WIDTH; x++) if(newGrid[y]?.[x]?.type === TileType.STORAGE) { const d = distance(nc, {x, y}); if(d < minStorageDist) { minStorageDist = d; nearestStorage = {x, y}; } }
                        if(nearestStorage) { const path = findPath(nc, nearestStorage, newGrid, newDesignations, prevColonists.filter((_,i)=>i!==idx)); if(path && path.length > 1) { nc.task = 'MOVING_TO_EAT'; nc.path = path.slice(1); nc.target = nearestStorage; nc.patience = C.COLONIST_PATIENCE; addLog(`${nc.name} is hungry, going to get food.`); needsOverride = true; } }
                    } else {
                        let nearestHarvestable: Point | null = null, minHarvestDist = Infinity;
                        for (let y = 0; y < C.GRID_HEIGHT; y++) for (let x = 0; x < C.GRID_WIDTH; x++) {
                            const tile = newGrid[y]?.[x];
                            if (tile?.type === TileType.HYDROPONICS_TRAY && tile.growth && tile.growth >= C.CROP_GROWTH_DURATION && !claimedTargetsThisTick.has(`${x},${y}`)) {
                                const d = distance(nc, { x, y }); if (d < minHarvestDist) { minHarvestDist = d; nearestHarvestable = { x, y }; }
                            }
                        }
                        if (nearestHarvestable) {
                            const path = findPath(nc, nearestHarvestable, newGrid, newDesignations, prevColonists.filter((_, i) => i !== idx));
                            if (path && path.length > 1) { nc.task = 'MOVING_TO_HARVEST'; nc.target = nearestHarvestable; nc.path = path.slice(1); nc.patience = C.COLONIST_PATIENCE; addLog(`${nc.name} is starving and must harvest food.`); claimedTargetsThisTick.add(`${nearestHarvestable.x},${nearestHarvestable.y}`); needsOverride = true; }
                        } else {
                            let nearestPlantable: Point | null = null, minPlantDist = Infinity;
                            for (let y = 0; y < C.GRID_HEIGHT; y++) for (let x = 0; x < C.GRID_WIDTH; x++) {
                                const tile = newGrid[y]?.[x];
                                if (tile?.type === TileType.HYDROPONICS_TRAY && tile.growth === undefined && !claimedTargetsThisTick.has(`${x},${y}`)) {
                                    const d = distance(nc, { x, y }); if (d < minPlantDist) { minPlantDist = d; nearestPlantable = { x, y }; }
                                }
                            }
                            if (nearestPlantable) {
                                const path = findPath(nc, nearestPlantable, newGrid, newDesignations, prevColonists.filter((_, i) => i !== idx));
                                if (path && path.length > 1) { nc.task = 'MOVING_TO_PLANT'; nc.target = nearestPlantable; nc.path = path.slice(1); nc.patience = C.COLONIST_PATIENCE; addLog(`${nc.name} is starving and must plant seeds.`); claimedTargetsThisTick.add(`${nearestPlantable.x},${nearestPlantable.y}`); needsOverride = true; }
                            }
                        }
                    }
                }
                if (!needsOverride && nc.boredom >= C.HIGH_BOREDOM_THRESHOLD && nc.task !== 'PLAYING' && nc.task !== 'MOVING_TO_PLAY') {
                    let nearestArcade: Point | null = null; let minArcadeDist = Infinity;
                    for (let y = 0; y < C.GRID_HEIGHT; y++) {
                        for (let x = 0; x < C.GRID_WIDTH; x++) {
                            if (newGrid[y]?.[x]?.type === TileType.ARCADE_MACHINE && !claimedTargetsThisTick.has(`${x},${y}`)) {
                                const d = distance(nc, { x, y });
                                if (d < minArcadeDist) { minArcadeDist = d; nearestArcade = { x, y }; }
                            }
                        }
                    }
                    if (nearestArcade) {
                        const path = findPath(nc, nearestArcade, newGrid, newDesignations, prevColonists.filter((_, i) => i !== idx));
                        if (path && path.length > 0) {
                            nc.task = 'MOVING_TO_PLAY'; nc.path = path.slice(1); nc.target = nearestArcade; nc.patience = C.COLONIST_PATIENCE;
                            addLog(`${nc.name} is bored, going to play.`);
                            claimedTargetsThisTick.add(`${nearestArcade.x},${nearestArcade.y}`);
                            needsOverride = true;
                        }
                    }
                }

                if (needsOverride) return nc;

                if (nc.task === 'IDLE') {
                    let taskFound = false;
                    
                    if (nc.carrying) {
                        let nearestStorage: Point | null = null, minStorageDist = Infinity;
                        for (let y = 0; y < C.GRID_HEIGHT; y++) for (let x = 0; x < C.GRID_WIDTH; x++) if(newGrid[y]?.[x]?.type === TileType.STORAGE) { const d = distance(nc, {x, y}); if(d < minStorageDist) { minStorageDist = d; nearestStorage = {x, y}; } }
                        if(nearestStorage) { const path = findPath(nc, nearestStorage, newGrid, newDesignations, prevColonists.filter((_,i)=>i!==idx)); if(path && path.length > 1) { nc.task = 'MOVING_TO_STORAGE'; nc.path = path.slice(1); nc.patience = C.COLONIST_PATIENCE; taskFound = true; } }
                    }

                    if (!taskFound) {
                        let nearestHarvest: Point | null = null, minHarvestDist = Infinity;
                        for (let y = 0; y < C.GRID_HEIGHT; y++) for (let x = 0; x < C.GRID_WIDTH; x++) {
                            const tile = newGrid[y]?.[x];
                            if (tile?.type === TileType.HYDROPONICS_TRAY && tile.growth && tile.growth >= C.CROP_GROWTH_DURATION && !claimedTargetsThisTick.has(`${x},${y}`)) {
                                const d = distance(nc, { x, y }); if (d < minHarvestDist) { minHarvestDist = d; nearestHarvest = { x, y }; }
                            }
                        }
                        if (nearestHarvest) {
                            const path = findPath(nc, nearestHarvest, newGrid, newDesignations, prevColonists.filter((_, i) => i !== idx));
                            if (path && path.length > 1) { nc.task = 'MOVING_TO_HARVEST'; nc.target = nearestHarvest; nc.path = path.slice(1); nc.patience = C.COLONIST_PATIENCE; taskFound = true; addLog(`${nc.name} is going to harvest food.`); claimedTargetsThisTick.add(`${nearestHarvest.x},${nearestHarvest.y}`); }
                        }
                    }

                    if (!taskFound) {
                        let nearestDropped: Point | null = null, minDroppedDist = Infinity;
                        for (let y = 0; y < C.GRID_HEIGHT; y++) for (let x = 0; x < C.GRID_WIDTH; x++) {
                             const tileType = newGrid[y]?.[x]?.type;
                             if ((tileType === TileType.DROPPED_MINERAL || tileType === TileType.DROPPED_GEM || tileType === TileType.DROPPED_LOG || tileType === TileType.DROPPED_FOOD || tileType === TileType.DROPPED_STONE) && !claimedTargetsThisTick.has(`${x},${y}`)) { const d = distance(nc, { x, y }); if (d < minDroppedDist) { minDroppedDist = d; nearestDropped = { x, y }; } }
                        }
                        if (nearestDropped) {
                            const path = findPath(nc, nearestDropped, newGrid, newDesignations, prevColonists.filter((_,i)=>i!==idx));
                            if(path && path.length > 1) { nc.task = 'MOVING_TO_HAUL'; nc.target = nearestDropped; nc.path = path.slice(1); nc.patience = C.COLONIST_PATIENCE; taskFound = true; addLog(`${nc.name} is going to haul resources.`); claimedTargetsThisTick.add(`${nearestDropped.x},${nearestDropped.y}`);}
                        }
                    }

                    if (!taskFound) {
                        let nearestTask: {x:number, y:number, type:DesignationType} | null = null, minTaskDist = Infinity;
                        for (let y = 0; y < C.GRID_HEIGHT; y++) for(let x = 0; x < C.GRID_WIDTH; x++) {
                            const des = newDesignations[y][x];
                            if (des && !claimedTargetsThisTick.has(`${x},${y}`)) {
                                if((des === DesignationType.BUILD_WOOD_FLOOR && storedLogs < C.FLOOR_COST) || (des === DesignationType.BUILD_WOOD_WALL && storedLogs < C.WALL_COST) || (des === DesignationType.BUILD_DOOR && storedLogs < C.DOOR_COST) || (des === DesignationType.BUILD_BED && storedLogs < C.BED_COST) || (des === DesignationType.BUILD_STORAGE && storedLogs < C.STORAGE_COST) || (des === DesignationType.BUILD_HYDROPONICS && (storedLogs < C.HYDROPONICS_COST.logs || storedStone < C.HYDROPONICS_COST.stone || storedMinerals < C.HYDROPONICS_COST.minerals)) || (des === DesignationType.BUILD_ARCADE && (storedLogs < C.ARCADE_COST.logs || storedStone < C.ARCADE_COST.stone || storedMinerals < C.ARCADE_COST.minerals || storedGems < C.ARCADE_COST.gems)) || (des === DesignationType.BUILD_STONE_WALL && storedStone < C.STONE_WALL_COST) || (des === DesignationType.BUILD_STONE_FLOOR && storedStone < C.STONE_FLOOR_COST) || (des === DesignationType.UPGRADE_TO_STONE_WALL && storedStone < C.STONE_WALL_COST) || (des === DesignationType.UPGRADE_TO_STONE_FLOOR && storedStone < C.STONE_FLOOR_COST) ) continue;
                                const d = distance(nc, {x, y});
                                if (d < minTaskDist && isTileDesignatable(newGrid[y][x].type, des)) { minTaskDist = d; nearestTask = {x, y, type: des}; }
                            }
                        }

                        if (nearestTask) {
                            const targetDesignation = nearestTask.type;
                            if (targetDesignation === DesignationType.MINE || targetDesignation === DesignationType.CHOP) {
                                const taskName = targetDesignation === DesignationType.MINE ? 'MINE' : 'CHOP';
                                const neighbors = [[-1, 0], [1, 0], [0, -1], [0, 1]].map(([dx, dy]) => ({ x: nearestTask!.x + dx, y: nearestTask!.y + dy })).filter(({x, y}) => validTile(newGrid, y, x) && ([TileType.EMPTY, TileType.WOOD_FLOOR, TileType.STONE_FLOOR, TileType.DOOR].includes(newGrid[y][x].type)));
                                for(const neighbor of neighbors) {
                                    if (pawnTiles.has(`${neighbor.x},${neighbor.y}`)) continue;
                                    const path = findPath(nc, neighbor, newGrid, newDesignations, prevColonists.filter((_,i)=>i!==idx));
                                    if (path && path.length > 1) { nc.task = `MOVING_TO_${taskName}`; nc.target = nearestTask; nc.path = path.slice(1); nc.patience = C.COLONIST_PATIENCE; taskFound = true; addLog(`${nc.name} is going to ${taskName.toLowerCase()} at (${nc.target.x}, ${nc.target.y}).`); claimedTargetsThisTick.add(`${nearestTask.x},${nearestTask.y}`); break; }
                                }
                            } else if (targetDesignation.startsWith('BUILD') || targetDesignation.startsWith('UPGRADE')) {
                                const path = findPath(nc, nearestTask, newGrid, newDesignations, prevColonists.filter((_,i)=>i!==idx));
                                 if (path && path.length > 1) { nc.task = 'MOVING_TO_BUILD'; nc.target = nearestTask; nc.path = path.slice(1); nc.patience = C.COLONIST_PATIENCE; taskFound = true; addLog(`${nc.name} is going to build at (${nc.target.x}, ${nc.target.y}).`); claimedTargetsThisTick.add(`${nearestTask.x},${nearestTask.y}`); }
                            }
                        }
                    }

                    if (!taskFound) {
                        const needsLogs = newDesignations.flat().some(d => (d === DesignationType.BUILD_WOOD_WALL && storedLogs < C.WALL_COST) || (d === DesignationType.BUILD_DOOR && storedLogs < C.DOOR_COST) || (d === DesignationType.BUILD_BED && storedLogs < C.BED_COST) || (d === DesignationType.BUILD_STORAGE && storedLogs < C.STORAGE_COST) || (d === DesignationType.BUILD_HYDROPONICS && storedLogs < C.HYDROPONICS_COST.logs) || (d === DesignationType.BUILD_ARCADE && storedLogs < C.ARCADE_COST.logs));
                        const needsStone = newDesignations.flat().some(d => (d === DesignationType.BUILD_STONE_WALL && storedStone < C.STONE_WALL_COST) || (d === DesignationType.BUILD_STONE_FLOOR && storedStone < C.STONE_FLOOR_COST) || (d === DesignationType.UPGRADE_TO_STONE_WALL && storedStone < C.STONE_WALL_COST) || (d === DesignationType.UPGRADE_TO_STONE_FLOOR && storedStone < C.STONE_FLOOR_COST) || (d === DesignationType.BUILD_HYDROPONICS && storedStone < C.HYDROPONICS_COST.stone) || (d === DesignationType.BUILD_ARCADE && storedStone < C.ARCADE_COST.stone));
                        const needsMinerals = newDesignations.flat().some(d => (d === DesignationType.BUILD_HYDROPONICS && storedMinerals < C.HYDROPONICS_COST.minerals) || (d === DesignationType.BUILD_ARCADE && storedMinerals < C.ARCADE_COST.minerals));
                        const needsGems = newDesignations.flat().some(d => d === DesignationType.BUILD_ARCADE && storedGems < C.ARCADE_COST.gems);
                
                        let resourceTarget: { types: TileType[], task: 'CHOP' | 'MINE', name: string } | null = null;
                        if (needsLogs) resourceTarget = { types: [TileType.TREE], task: 'CHOP', name: 'logs' };
                        else if (needsStone) resourceTarget = { types: [TileType.ROCK], task: 'MINE', name: 'stone' };
                        else if (needsMinerals) resourceTarget = { types: [TileType.MINERAL, TileType.GEM], task: 'MINE', name: 'minerals' };
                        else if (needsGems) resourceTarget = { types: [TileType.GEM], task: 'MINE', name: 'gems' };

                        if (resourceTarget) {
                            let sources: (Point & { dist: number })[] = [];
                            for (let y = 0; y < C.GRID_HEIGHT; y++) for (let x = 0; x < C.GRID_WIDTH; x++) {
                                if (resourceTarget.types.includes(newGrid[y][x].type)) sources.push({ x, y, dist: distance(nc, { x, y }) });
                            }
                            sources.sort((a, b) => a.dist - b.dist);

                            for (const source of sources) {
                                const neighbors = [[-1, 0], [1, 0], [0, -1], [0, 1]].map(([dx, dy]) => ({ x: source.x + dx, y: source.y + dy })).filter(({ x, y }) => validTile(newGrid, y, x) && [TileType.EMPTY, TileType.WOOD_FLOOR, TileType.STONE_FLOOR, TileType.DOOR].includes(newGrid[y][x].type) && !pawnTiles.has(`${x},${y}`));
                                let bestPath: Point[] | null = null;
                                for (const neighbor of neighbors) {
                                    const path = findPath(nc, neighbor, newGrid, newDesignations, prevColonists.filter((_, i) => i !== idx));
                                    if (path && (!bestPath || path.length < bestPath.length)) bestPath = path;
                                }
                                if (bestPath) {
                                    nc.task = `MOVING_TO_${resourceTarget.task}`; nc.target = source; nc.path = bestPath.slice(1); nc.patience = C.COLONIST_PATIENCE; taskFound = true; addLog(`${nc.name} needs ${resourceTarget.name}, going to ${resourceTarget.task.toLowerCase()}.`); claimedTargetsThisTick.add(`${source.x},${source.y}`); break;
                                }
                            }
                            
                            if (!taskFound) {
                                for (const source of sources) {
                                    const neighbors = [[-1, 0], [1, 0], [0, -1], [0, 1]].map(([dx, dy]) => ({ x: source.x + dx, y: source.y + dy })).filter(({ x, y }) => validTile(newGrid, y, x) && ([TileType.EMPTY, TileType.WOOD_FLOOR, TileType.STONE_FLOOR, TileType.DOOR].includes(newGrid[y][x].type) || newDesignations[y]?.[x] === DesignationType.MINE) && !pawnTiles.has(`${x},${y}`));
                                    let bestHypoPath: Point[] | null = null;
                                    for (const neighbor of neighbors) {
                                        const path = findPath(nc, neighbor, newGrid, newDesignations, prevColonists.filter((_, i) => i !== idx), [DesignationType.MINE]);
                                        if (path && (!bestHypoPath || path.length < bestHypoPath.length)) bestHypoPath = path;
                                    }
                                    if (bestHypoPath) {
                                        const firstBlocker = bestHypoPath.find(p => [TileType.ROCK, TileType.MINERAL, TileType.GEM].includes(newGrid[p.y][p.x].type) && newDesignations[p.y]?.[p.x] === DesignationType.MINE);
                                        if (firstBlocker) {
                                            const blockerNeighbors = [[-1, 0], [1, 0], [0, -1], [0, 1]].map(([dx, dy]) => ({ x: firstBlocker.x + dx, y: firstBlocker.y + dy })).filter(({ x, y }) => validTile(newGrid, y, x) && [TileType.EMPTY, TileType.WOOD_FLOOR, TileType.STONE_FLOOR, TileType.DOOR].includes(newGrid[y][x].type) && !pawnTiles.has(`${x},${y}`));
                                            let bestPathToBlocker: Point[] | null = null;
                                            for(const bNeighbor of blockerNeighbors) {
                                                const path = findPath(nc, bNeighbor, newGrid, newDesignations, prevColonists.filter((_, i) => i !== idx));
                                                if(path && (!bestPathToBlocker || path.length < bestPathToBlocker.length)) bestPathToBlocker = path;
                                            }
                                            if (bestPathToBlocker) {
                                                nc.task = 'MOVING_TO_MINE'; nc.target = firstBlocker; nc.path = bestPathToBlocker.slice(1); nc.patience = C.COLONIST_PATIENCE; taskFound = true; addLog(`${nc.name} is clearing a path to resources.`); claimedTargetsThisTick.add(`${firstBlocker.x},${firstBlocker.y}`); break;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    if (!taskFound) {
                        let nearestPlant: Point | null = null, minPlantDist = Infinity;
                        for (let y = 0; y < C.GRID_HEIGHT; y++) for (let x = 0; x < C.GRID_WIDTH; x++) {
                            const tile = newGrid[y]?.[x];
                            if (tile?.type === TileType.HYDROPONICS_TRAY && tile.growth === undefined && !claimedTargetsThisTick.has(`${x},${y}`)) {
                                const d = distance(nc, { x, y }); if (d < minPlantDist) { minPlantDist = d; nearestPlant = { x, y }; }
                            }
                        }
                        if (nearestPlant) {
                            const path = findPath(nc, nearestPlant, newGrid, newDesignations, prevColonists.filter((_, i) => i !== idx));
                            if (path && path.length > 1) { nc.task = 'MOVING_TO_PLANT'; nc.target = nearestPlant; nc.path = path.slice(1); nc.patience = C.COLONIST_PATIENCE; taskFound = true; addLog(`${nc.name} is going to plant seeds.`); claimedTargetsThisTick.add(`${nearestPlant.x},${nearestPlant.y}`); }
                        }
                    }
                }

                if (nc.task.startsWith('MOVING_')) {
                    if (nc.path.length > 0) {
                        const nextStep = nc.path.shift() as Point;
                        if (prevColonists.some((p,i2)=>i2!==idx && p.x===nextStep.x && p.y===nextStep.y)) {
                            nc.path.unshift(nextStep); 
                            nc.patience = (nc.patience || C.COLONIST_PATIENCE) - 1;
                            if (nc.patience <= 0) { nc.task = 'IDLE'; nc.path = []; nc.target = null; addLog(`${nc.name} is stuck and is reconsidering their life choices.`); }
                        } else { nc.x = nextStep.x; nc.y = nextStep.y; nc.patience = C.COLONIST_PATIENCE; }
                    } else {
                        if(nc.task === 'MOVING_TO_IDLE') { nc.task = 'IDLE'; }
                        else if(nc.task === 'MOVING_TO_MINE') { nc.task = 'MINING'; }
                        else if(nc.task === 'MOVING_TO_CHOP') { nc.task = 'CHOPPING'; }
                        else if(nc.task === 'MOVING_TO_BUILD') { nc.task = 'BUILDING'; }
                        else if(nc.task === 'MOVING_TO_PLANT') { nc.task = 'PLANTING'; }
                        else if(nc.task === 'MOVING_TO_HARVEST') { nc.task = 'HARVESTING_FOOD'; }
                        else if(nc.task === 'MOVING_TO_HAUL') {
                            const currentTile = newGrid[nc.y]?.[nc.x];
                            if (currentTile) {
                                if (currentTile.type === TileType.DROPPED_MINERAL) nc.carrying = TileType.MINERAL;
                                else if (currentTile.type === TileType.DROPPED_GEM) nc.carrying = TileType.GEM;
                                else if (currentTile.type === TileType.DROPPED_LOG) nc.carrying = 'LOGS';
                                else if (currentTile.type === TileType.DROPPED_FOOD) nc.carrying = 'FOOD';
                                else if (currentTile.type === TileType.DROPPED_STONE) nc.carrying = 'STONE';
                                nc.carryingAmount = 1;
                                
                                let floorTypeAfterHaul = TileType.WOOD_FLOOR;
                                const neighbors = [[-1, 0], [1, 0], [0, -1], [0, 1]];
                                for (const [dx, dy] of neighbors) {
                                    const neighborTile = newGrid[nc.y + dy]?.[nc.x + dx];
                                    if (neighborTile && neighborTile.type === TileType.STONE_FLOOR) {
                                        floorTypeAfterHaul = TileType.STONE_FLOOR;
                                        break;
                                    }
                                }
                                currentTile.type = floorTypeAfterHaul;
                                gridChanged = true;
                            }
                            let nearestStorage: Point | null = null, minStorageDist = Infinity;
                            for (let y = 0; y < C.GRID_HEIGHT; y++) for (let x = 0; x < C.GRID_WIDTH; x++) if(newGrid[y]?.[x]?.type === TileType.STORAGE) { const d = distance(nc, {x, y}); if(d < minStorageDist) { minStorageDist = d; nearestStorage = {x, y}; } }
                            if(nearestStorage) { const path = findPath(nc, nearestStorage, newGrid, newDesignations, prevColonists.filter((_,i)=>i!==idx)); if(path && path.length > 1) { nc.task = 'MOVING_TO_STORAGE'; nc.path = path.slice(1); nc.patience = C.COLONIST_PATIENCE; } else { nc.task = 'IDLE'; } } else { nc.task = 'IDLE'; }
                        }
                        else if(nc.task === 'MOVING_TO_STORAGE') {
                            if (nc.carrying === TileType.MINERAL) mineralsThisTick++;
                            else if (nc.carrying === TileType.GEM) gemsThisTick++;
                            else if (nc.carrying === 'LOGS') logsThisTick++;
                            else if (nc.carrying === 'STONE') stoneThisTick++;
                            else if (nc.carrying === 'FOOD') foodThisTick += (nc.carryingAmount || 1);
                            addLog(`${nc.name} stored a resource.`);
                            nc.carrying = null; nc.carryingAmount = undefined; happinessBoostThisTick = true; nc.task = 'IDLE';
                        }
                        else if(nc.task === 'MOVING_TO_REST') nc.task = 'RESTING';
                        else if(nc.task === 'MOVING_TO_EAT') { nc.task = 'EATING'; foodThisTick--; }
                        else if(nc.task === 'MOVING_TO_PLAY') nc.task = 'PLAYING';
                    }
                }

                if (nc.task === 'MINING' || nc.task === 'CHOPPING' || nc.task === 'BUILDING' || nc.task === 'PLANTING' || nc.task === 'HARVESTING_FOOD') {
                    if (!nc.target) { nc.task = 'IDLE'; return nc; }
                    const requiredDuration = nc.task === 'MINING' ? C.MINING_DURATION : nc.task === 'CHOPPING' ? C.CHOPPING_DURATION : nc.task === 'PLANTING' ? C.PLANTING_DURATION : nc.task === 'HARVESTING_FOOD' ? C.HARVESTING_DURATION : C.BUILD_DURATION;
                    nc.workTicks += workSpeedModifier;
                    if (nc.workTicks >= requiredDuration) {
                        const {x, y} = nc.target;
                        const targetTile = newGrid[y]?.[x];
                        const targetDesignation = newDesignations[y]?.[x];

                        if (nc.task === 'HARVESTING_FOOD') {
                            addLog(`${nc.name} harvested ${C.FOOD_YIELD_PER_HARVEST} food at (${x}, ${y}).`);
                            if(targetTile) targetTile.growth = undefined;
                            gridChanged = true;
                            nc.carrying = 'FOOD';
                            nc.carryingAmount = C.FOOD_YIELD_PER_HARVEST;

                            let nearestStorage: Point | null = null, minStorageDist = Infinity;
                            for (let y = 0; y < C.GRID_HEIGHT; y++) for (let x = 0; x < C.GRID_WIDTH; x++) if(newGrid[y]?.[x]?.type === TileType.STORAGE) { const d = distance(nc, {x, y}); if(d < minStorageDist) { minStorageDist = d; nearestStorage = {x, y}; } }
                            if(nearestStorage) { const path = findPath(nc, nearestStorage, newGrid, newDesignations, prevColonists.filter((_,i)=>i!==idx)); if(path && path.length > 1) { nc.task = 'MOVING_TO_STORAGE'; nc.path = path.slice(1); nc.patience = C.COLONIST_PATIENCE; } else { nc.task = 'IDLE'; } } else { nc.task = 'IDLE'; }
                            
                            nc.workTicks = 0; nc.target = null;
                            return nc;
                        }

                        if (targetTile) {
                             if(nc.task === 'MINING') {
                                addLog(`${nc.name} finished mining at (${x}, ${y}).`);
                                if (targetTile.type === TileType.MINERAL) targetTile.type = TileType.DROPPED_MINERAL;
                                else if (targetTile.type === TileType.GEM) targetTile.type = TileType.DROPPED_GEM;
                                else if (targetTile.type === TileType.ROCK) targetTile.type = TileType.DROPPED_STONE;
                                else targetTile.type = TileType.EMPTY;
                            } else if (nc.task === 'CHOPPING') {
                                addLog(`${nc.name} finished chopping at (${x}, ${y}).`);
                                targetTile.type = TileType.DROPPED_LOG;
                            } else if (nc.task === 'BUILDING') {
                                if(targetDesignation === DesignationType.BUILD_WOOD_FLOOR) { addLog(`${nc.name} finished building wood floor at (${x}, ${y}).`); targetTile.type = TileType.WOOD_FLOOR; logsThisTick -= C.FLOOR_COST; } 
                                else if (targetDesignation === DesignationType.BUILD_WOOD_WALL) { addLog(`${nc.name} finished building wood wall at (${x}, ${y}).`); targetTile.type = TileType.WOOD_WALL; logsThisTick -= C.WALL_COST; } 
                                else if (targetDesignation === DesignationType.BUILD_STONE_FLOOR) { addLog(`${nc.name} finished building stone floor at (${x}, ${y}).`); targetTile.type = TileType.STONE_FLOOR; stoneThisTick -= C.STONE_FLOOR_COST; } 
                                else if (targetDesignation === DesignationType.BUILD_STONE_WALL) { addLog(`${nc.name} finished building stone wall at (${x}, ${y}).`); targetTile.type = TileType.STONE_WALL; stoneThisTick -= C.STONE_WALL_COST; } 
                                else if (targetDesignation === DesignationType.UPGRADE_TO_STONE_FLOOR) { addLog(`${nc.name} upgraded floor to stone at (${x}, ${y}).`); targetTile.type = TileType.STONE_FLOOR; stoneThisTick -= C.STONE_FLOOR_COST; }
                                else if (targetDesignation === DesignationType.UPGRADE_TO_STONE_WALL) { addLog(`${nc.name} upgraded wall to stone at (${x}, ${y}).`); targetTile.type = TileType.STONE_WALL; stoneThisTick -= C.STONE_WALL_COST; }
                                else if (targetDesignation === DesignationType.BUILD_DOOR) { addLog(`${nc.name} finished building door at (${x}, ${y}).`); targetTile.type = TileType.DOOR; logsThisTick -= C.DOOR_COST; } 
                                else if (targetDesignation === DesignationType.BUILD_BED) { addLog(`${nc.name} finished building bed at (${x}, ${y}).`); targetTile.type = TileType.BED; logsThisTick -= C.BED_COST; } 
                                else if (targetDesignation === DesignationType.BUILD_STORAGE) { addLog(`${nc.name} finished building storage at (${x}, ${y}).`); targetTile.type = TileType.STORAGE; logsThisTick -= C.STORAGE_COST; }
                                else if (targetDesignation === DesignationType.BUILD_HYDROPONICS) { addLog(`${nc.name} finished building hydroponics at (${x}, ${y}).`); targetTile.type = TileType.HYDROPONICS_TRAY; logsThisTick -= C.HYDROPONICS_COST.logs; stoneThisTick -= C.HYDROPONICS_COST.stone; mineralsThisTick -= C.HYDROPONICS_COST.minerals; }
                                else if (targetDesignation === DesignationType.BUILD_ARCADE) { addLog(`${nc.name} finished building arcade at (${x}, ${y}).`); targetTile.type = TileType.ARCADE_MACHINE; logsThisTick -= C.ARCADE_COST.logs; stoneThisTick -= C.ARCADE_COST.stone; mineralsThisTick -= C.ARCADE_COST.minerals; gemsThisTick -= C.ARCADE_COST.gems; }
                            } else if (nc.task === 'PLANTING') {
                                addLog(`${nc.name} finished planting at (${x}, ${y}).`);
                                targetTile.growth = 0;
                            }
                            gridChanged = true;
                        }
                        if (validTile(newDesignations, y, x)) { newDesignations[y][x] = null; }
                        nc.task = 'IDLE'; nc.workTicks = 0; nc.target = null;
                    }
                }
                if (nc.task === 'RESTING') { if (nc.energy >= C.MAX_ENERGY) { nc.energy = C.MAX_ENERGY; nc.task = 'IDLE'; addLog(`${nc.name} is fully rested.`); } else { nc.energy += 10; } }
                if (nc.task === 'EATING') { nc.hunger = Math.max(0, nc.hunger - C.FOOD_NUTRITION); nc.task = 'IDLE'; addLog(`${nc.name} finished eating.`); }
                if (nc.task === 'PLAYING') { if (nc.boredom <= 0) { nc.boredom = 0; nc.task = 'IDLE'; addLog(`${nc.name} is no longer bored.`); } else { nc.boredom -= C.FUN_RECOVERY_RATE; } }
                
                return nc;
            });
            
            let finalColonists = updatedColonists;

            if (deathsThisTick.length > 0) {
                deathsThisTick.forEach(death => {
                    addLog(`${death.colonist.name} has died from ${death.cause}.`, 'event');
                });

                const deadIds = new Set(deathsThisTick.map(d => d.colonist.id));
                const deadIndices = new Set(prevColonists.map((c, i) => ({c, i})).filter(p => deadIds.has(p.c.id)).map(p => p.i));

                setColonistLogs(prevLogs => prevLogs.filter((_, i) => !deadIndices.has(i)));
                
                finalColonists = updatedColonists
                    .filter(c => !deadIds.has(c.id))
                    .map(c => ({
                        ...c,
                        happiness: Math.max(0, c.happiness - (C.HAPPINESS_PENALTY_PER_DEATH * deathsThisTick.length))
                    }));

                if (finalColonists.length === 0) {
                    addLog("The last colonist has perished. The simulation has failed.", "event");
                    setIsPlaying(false);
                }
            }

            const newTotalMinerals = storedMinerals + mineralsThisTick;

            if (mineralsThisTick !== 0) setStoredMinerals(prev => Math.max(0, prev + mineralsThisTick));
            if (gemsThisTick !== 0) setStoredGems(prev => Math.max(0, prev + gemsThisTick));
            if (logsThisTick !== 0) setStoredLogs(prev => Math.max(0, prev + logsThisTick));
            if (stoneThisTick !== 0) setStoredStone(prev => Math.max(0, prev + stoneThisTick));
            if (foodThisTick !== 0) setStoredFood(prev => Math.max(0, prev + foodThisTick));

            recordColonistWorkLog(finalColonists, tickCount);
            
            if (happinessBoostThisTick && finalColonists.length > 0) {
                finalColonists = finalColonists.map(c => ({ ...c, happiness: Math.min(C.MAX_HAPPINESS, c.happiness + C.HAPPINESS_BOOST_ON_STORE) }));
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
    }, [grid, designations, averageHappiness, selectedColonist, storedMinerals, storedGems, storedLogs, storedStone, storedFood, recordColonistWorkLog, tickCount, milestoneLevel, currentGoal, activeEvents, colonists.length, addLog, isNarrating, generateChronicleUpdate]);

    const generateProceduralGrid = useCallback((currentSeed: string): Grid => {
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
                if(validTile(newGrid, y, x)) newGrid[y][x].type = TileType.WOOD_FLOOR;
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
        
        return newGrid;
    }, []);

    const resetGame = useCallback(async (newSeed?: string) => {
        setIsGenerating(true);
        setShowIntro(true);
        setIsPlaying(false);
        setImportError("");
        const seedToUse = newSeed || Date.now().toString().slice(-4);
        setSeed(seedToUse);

        const storyData = await generateInitialStory();
        setColonyName(storyData.colonyName);
        setAsteroidName(storyData.asteroidName);
        
        addLog(`Generating new asteroid with seed: ${seedToUse}...`);
        
        const newGrid = generateProceduralGrid(seedToUse);
        const newDesignations: Designations = Array.from({ length: C.GRID_HEIGHT }, () => Array(C.GRID_WIDTH).fill(null));
        
        const startX = Math.floor(C.GRID_WIDTH / 2);
        const startY = Math.floor(C.GRID_HEIGHT / 2);
        const shelterRect = { x0: startX - 4, y0: startY, x1: startX + 4, y1: startY + 5 };
        for(let x = shelterRect.x0; x <= shelterRect.x1; x++) {
            if(validTile(newGrid, shelterRect.y0, x) && isTileDesignatable(newGrid[shelterRect.y0][x].type, DesignationType.BUILD_WOOD_WALL)) newDesignations[shelterRect.y0][x] = DesignationType.BUILD_WOOD_WALL;
            if(validTile(newGrid, shelterRect.y1, x) && isTileDesignatable(newGrid[shelterRect.y1][x].type, DesignationType.BUILD_WOOD_WALL)) newDesignations[shelterRect.y1][x] = DesignationType.BUILD_WOOD_WALL;
        }
        for(let y = shelterRect.y0 + 1; y < shelterRect.y1; y++) {
            if(validTile(newGrid, y, shelterRect.x0) && isTileDesignatable(newGrid[y][shelterRect.x0].type, DesignationType.BUILD_WOOD_WALL)) newDesignations[y][shelterRect.x0] = DesignationType.BUILD_WOOD_WALL;
            if(validTile(newGrid, y, shelterRect.x1) && isTileDesignatable(newGrid[y][shelterRect.x1].type, DesignationType.BUILD_WOOD_WALL)) newDesignations[y][shelterRect.x1] = DesignationType.BUILD_WOOD_WALL;
        }
        const doorX = startX;
        const doorY = shelterRect.y1;
        if(validTile(newGrid, doorY, doorX)) newDesignations[doorY][doorX] = DesignationType.BUILD_DOOR;

        const startingPos = { x: startX, y: startY };
        const newColonists: Colonist[] = storyData.colonists.map((c, i) => ({
            id: `Colonist-${i + 1}`,
            name: c.name,
            backstory: c.backstory,
            x: startingPos.x + i,
            y: startY + 1,
            task: 'IDLE',
            target: null,
            path: [],
            workTicks: 0,
            carrying: null,
            energy: C.MAX_ENERGY,
            happiness: C.MAX_HAPPINESS,
            patience: C.COLONIST_PATIENCE,
            hunger: 0,
            boredom: 0,
            stuckTicks: 0,
            lastPosition: { x: startingPos.x + i, y: startY + 1 },
            criticallyLowEnergyTicks: 0,
            criticallyLowHungerTicks: 0,
        }));
        setGrid(newGrid);
        setDesignations(newDesignations);
        setColonists(newColonists);
        setStoredMinerals(0); setStoredGems(0); setStoredLogs(15); setStoredStone(0); setStoredFood(10); setSelectedColonist(null); setAverageHappiness(C.MAX_HAPPINESS); setWorkEfficiency(100);
        setMilestoneLevel(0); setCurrentGoal(C.INITIAL_GOAL);
        setActiveEvents([]);
        setEventPopup(null);
        setGameLog([]); setGameTime(0);
        setTickCount(0); setCurrentDay(1); setCurrentHour(6);
        setChronology([{ timestamp: 'Day 1, 06:00', message: storyData.firstEntry }]);
        setColonistLogs(Array.from({ length: newColonists.length }, () => Array(C.DAY_LENGTH_TICKS).fill(null)));
        addLog(`Simulation started. Welcome to ${storyData.colonyName}.`);
        addLog('A small supply cache was found, providing 15 logs.');
        setApiFailed(false);
        setIsGenerating(false);
    }, [generateProceduralGrid, addLog]);
    
    const closeEventPopup = useCallback(async () => {
        const event = eventPopup;
        if (!event) {
            setIsPlaying(true);
            return;
        };

        if (event.id === 'NEW_COLONIST') {
            try {
                const storyData = await generateInitialStory();
                const newColonistData = storyData.colonists[0];
                const newId = `Colonist-${colonists.length + 1}`;
                const startX = Math.floor(C.GRID_WIDTH / 2), startY = Math.floor(C.GRID_HEIGHT / 2);
                const newColonist: Colonist = {id: newId, name: newColonistData.name, backstory: newColonistData.backstory, x: startX, y: startY, task: 'IDLE', target: null, path: [], workTicks: 0, carrying: null, energy: C.MAX_ENERGY, happiness: C.MAX_HAPPINESS, patience: C.COLONIST_PATIENCE, hunger: 0, boredom: 0, stuckTicks: 0, lastPosition: {x: startX, y: startY}, criticallyLowEnergyTicks: 0, criticallyLowHungerTicks: 0};
                setColonists(prev => [...prev, newColonist]);
                setColonistLogs(prev => [...prev, Array(C.DAY_LENGTH_TICKS).fill(null)]);
            } catch (error) {
                 console.error("Failed to generate new colonist, using fallback.", error);
            }
        } else if (event.id === 'TRAGIC_ACCIDENT') {
            setColonists(prevColonists => {
                if (prevColonists.length <= 1) {
                    addLog("A tragic accident was narrowly avoided.", "event");
                    return prevColonists;
                }
                const victimIndex = Math.floor(Math.random() * prevColonists.length);
                const victim = prevColonists[victimIndex];
                addLog(`${victim.name} has died in a tragic accident.`, 'event');
                setColonistLogs(prevLogs => prevLogs.filter((_, i) => i !== victimIndex));
                return prevColonists.filter((_, i) => i !== victimIndex);
            });
        } else {
             setActiveEvents(prev => [...prev.filter(e => e.id !== event.id), event]);
        }
        setEventPopup(null);
        setIsPlaying(true);
    }, [eventPopup, colonists.length, addLog]);

    useEffect(() => { resetGame(seed); // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!isPlaying || !grid || showIntro || eventPopup) return;
        const intervalId = setInterval(gameTick, C.GAME_TICK_MS);
        return () => clearInterval(intervalId);
    }, [isPlaying, grid, gameTick, showIntro, eventPopup]);

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

    useEffect(() => {
        if (!grid || !canvasRef.current) return;
        const canvas = canvasRef.current; const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.fillStyle = isDay ? C.PALETTE.BACKGROUND : C.PALETTE.NIGHT;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw background pattern
        ctx.globalAlpha = 0.5;
        ctx.font = "10px monospace";
        const patternColors = ['#a855f7', '#eab308']; // purple, yellow
        const patternPrng = createPRNG(seed + "_pattern");

        for (let y = 0; y < C.GRID_HEIGHT; y++) {
            for (let x = 0; x < C.GRID_WIDTH; x++) {
                if (x % 4 === 1 && y % 4 === 1) {
                    const drawX = x * C.TILE_SIZE + C.TILE_SIZE / 2;
                    const drawY = y * C.TILE_SIZE + C.TILE_SIZE / 2;
                    ctx.fillStyle = patternColors[Math.floor(patternPrng() * patternColors.length)];
                    ctx.fillText('+', drawX, drawY);
                }
            }
        }
        ctx.globalAlpha = 1.0; // Reset alpha

        ctx.font = `${C.TILE_SIZE * 0.9}px "Courier New", monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        
        for (let y = 0; y < C.GRID_HEIGHT; y++) for (let x = 0; x < C.GRID_WIDTH; x++) {
            const tile = grid[y]?.[x];
            if (tile) {
                const drawX = x * C.TILE_SIZE + C.TILE_SIZE / 2, drawY = y * C.TILE_SIZE + C.TILE_SIZE / 2;
                if(tile.type === TileType.WOOD_FLOOR) { ctx.fillStyle = C.PALETTE.WOOD_FLOOR; ctx.fillText(C.CHARS.WOOD_FLOOR, drawX, drawY); }
                else if (tile.type === TileType.STONE_FLOOR) { ctx.fillStyle = C.PALETTE.STONE_FLOOR; ctx.fillText(C.CHARS.STONE_FLOOR, drawX, drawY); }
                else if (tile.type === TileType.BED || tile.type === TileType.STORAGE || tile.type === TileType.HYDROPONICS_TRAY || tile.type === TileType.ARCADE_MACHINE) {
                    ctx.fillStyle = C.PALETTE.WOOD_FLOOR; ctx.fillText(C.CHARS.WOOD_FLOOR, drawX, drawY);
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
                    case TileType.DROPPED_STONE: color = C.PALETTE.DROPPED_STONE; charToDraw = C.CHARS.DROPPED_STONE; break;
                    case TileType.BED: color = C.PALETTE.BED; charToDraw = C.CHARS.BED; break;
                    case TileType.TREE: color = isDay ? C.PALETTE.TREE : "#166534"; charToDraw = C.CHARS.TREE; break;
                    case TileType.DROPPED_LOG: color = C.PALETTE.DROPPED_LOG; charToDraw = C.CHARS.DROPPED_LOG; break;
                    case TileType.WOOD_WALL: color = C.PALETTE.WOOD_WALL; charToDraw = C.CHARS.WOOD_WALL; break;
                    case TileType.STONE_WALL: color = C.PALETTE.STONE_WALL; charToDraw = C.CHARS.STONE_WALL; break;
                    case TileType.DOOR: color = C.PALETTE.DOOR; charToDraw = C.CHARS.DOOR; break;
                    case TileType.SAPLING: color = C.PALETTE.SAPLING; charToDraw = C.CHARS.SAPLING; break;
                    case TileType.HYDROPONICS_TRAY: color = C.PALETTE.HYDROPONICS; charToDraw = C.CHARS.HYDROPONICS; break;
                    case TileType.ARCADE_MACHINE: color = C.PALETTE.ARCADE; charToDraw = C.CHARS.ARCADE; break;
                    case TileType.DROPPED_FOOD: color = C.PALETTE.DROPPED_FOOD; charToDraw = C.CHARS.DROPPED_FOOD; break;
                }
                if (charToDraw) { ctx.fillStyle = color; ctx.fillText(charToDraw, drawX, drawY); }
            }
        }
        if (designations) for (let y = 0; y < C.GRID_HEIGHT; y++) for (let x = 0; x < C.GRID_WIDTH; x++) {
            const des = designations[y]?.[x];
            if (des) {
                if (des === DesignationType.MINE || des === DesignationType.CHOP || des === DesignationType.HARVEST) ctx.fillStyle = C.PALETTE.DESIGNATION_MINE;
                else if (des.startsWith('BUILD') || des.startsWith('UPGRADE')) ctx.fillStyle = C.PALETTE.DESIGNATION_BUILD;
                ctx.fillRect(x * C.TILE_SIZE, y * C.TILE_SIZE, C.TILE_SIZE, C.TILE_SIZE);
            }
        }

        colonists.forEach(c => {
            const drawX = c.x * C.TILE_SIZE + C.TILE_SIZE / 2, drawY = c.y * C.TILE_SIZE + C.TILE_SIZE / 2;
            ctx.fillStyle = (selectedColonist && c.id === selectedColonist.id) ? C.PALETTE.COLONIST_SELECTED : C.PALETTE.COLONIST;
            let char = C.CHARS.COLONIST;
            if(c.task === 'MINING' || c.task === 'BUILDING' || c.task === 'CHOPPING') char = C.CHARS.COLONIST_WORKING; if(c.carrying) char = C.CHARS.COLONIST_HAULING; if(c.task === 'RESTING') char = C.CHARS.COLONIST_RESTING; if(c.task === 'EATING') char = C.CHARS.COLONIST_EATING; if(c.task === 'PLAYING') char = C.CHARS.COLONIST_PLAYING;
            ctx.fillText(char, drawX, drawY);
        });
    }, [grid, colonists, selectedColonist, designations, isDay, seed]);

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
            setSelectedColonist(prev => (prev && clickedColonist && prev.id === clickedColonist.id) ? null : clickedColonist || null);
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
        if (!grid) return;
        const coords = getGridCoordsFromEvent(event);

        if (interactionMode === 'INSPECT' && coords) {
            const tileAtCoords = grid[coords.y]?.[coords.x];
            setHoveredTile(tileAtCoords || null);
        } else {
            setHoveredTile(null);
        }
        
        if (interactionMode === 'DESIGNATE' && isDesignating.current && designationStart.current && coords) {
            setDesignations(prev => {
                if (!prev || !designationDragStart.current || !designationType) return prev;
                const newD = designationDragStart.current.map(r => [...r]);
                const start = designationStart.current as Point;
                const end = coords;
                const x0 = Math.min(start.x, end.x), x1 = Math.max(start.x, end.x);
                const y0 = Math.min(start.y, end.y), y1 = Math.max(start.y, end.y);

                const isHollow = designationType === DesignationType.BUILD_WOOD_WALL || designationType === DesignationType.BUILD_DOOR || designationType === DesignationType.BUILD_STONE_WALL;

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
    const handleCanvasMouseLeave = () => {
        setHoveredTile(null);
        handleCanvasMouseUp();
    };
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
    
    const handleUnstuck = () => {
        if (!grid) return;

        if (unstuckTimeoutRef.current) {
            clearTimeout(unstuckTimeoutRef.current);
        }

        const newPressCount = unstuckPressCount + 1;
        setUnstuckPressCount(newPressCount);

        if (newPressCount === 1) {
            const newGrid = grid.map(r => r.map(c => ({...c})));
            let gridChanged = false;
        
            const updatedColonists = colonists.map(c => {
                if (c.carrying && validTile(newGrid, c.y, c.x) && [TileType.EMPTY, TileType.WOOD_FLOOR, TileType.STONE_FLOOR, TileType.DOOR, TileType.SAPLING].includes(newGrid[c.y][c.x].type)) {
                    let dropType: TileType | null = null;
                    if (c.carrying === TileType.MINERAL) dropType = TileType.DROPPED_MINERAL;
                    else if (c.carrying === TileType.GEM) dropType = TileType.DROPPED_GEM;
                    else if (c.carrying === 'LOGS') dropType = TileType.DROPPED_LOG;
                    else if (c.carrying === 'FOOD') dropType = TileType.DROPPED_FOOD;
                    else if (c.carrying === 'STONE') dropType = TileType.DROPPED_STONE;
        
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
                    energy: C.MAX_ENERGY,
                    hunger: 0,
                    boredom: 0
                };
            });
            
            setColonists(updatedColonists);
            if(gridChanged) {
                setGrid(newGrid);
            }
            addLog('All colonists soft-reset. Press again to teleport to safety.', 'event');

        } else if (newPressCount >= 2) {
            const startX = Math.floor(C.GRID_WIDTH / 2);
            const startY = Math.floor(C.GRID_HEIGHT / 2);
    
            const updatedColonists = colonists.map((c, i) => ({
                ...c,
                x: startX + i,
                y: startY + 1,
                task: 'IDLE',
                target: null,
                path: [],
                workTicks: 0,
                patience: C.COLONIST_PATIENCE,
                carrying: null,
                energy: C.MAX_ENERGY,
                hunger: 0,
                boredom: 0
            }));
            
            setColonists(updatedColonists);
            addLog('Colonists teleported to the starting area!', 'event');
            setUnstuckPressCount(0);
        }
        
        unstuckTimeoutRef.current = setTimeout(() => {
            setUnstuckPressCount(0);
        }, 2000);
    };

    const handleExportJson = () => {
        const gameState = {
            version: C.GAME_VERSION,
            seed,
            grid,
            designations,
            colonists,
            storedMinerals,
            storedGems,
            storedLogs,
            storedStone,
            storedFood,
            milestoneLevel,
            currentGoal,
            gameTime,
            tickCount,
            currentDay,
            currentHour,
            activeEvents,
            gameLog,
            colonyName,
            asteroidName,
            chronology,
            colonistLogs,
            apiFailed,
        };
        const jsonString = JSON.stringify(gameState, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${colonyName.replace(/\s/g, '_')}_Day${currentDay}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        addLog("Game state exported.");
        setShowSettings(false);
    };

    const handleImportJson = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') throw new Error("Invalid file content");
                const loadedState = JSON.parse(text);

                if (!loadedState.grid || !loadedState.colonists || !loadedState.version) {
                    throw new Error("Invalid save file format.");
                }
                if (loadedState.version !== C.GAME_VERSION) {
                    throw new Error(`Incompatible save version. Expected ${C.GAME_VERSION}, got ${loadedState.version}.`);
                }

                const loadedColonists = loadedState.colonists.map((c: Colonist) => ({
                    ...c,
                    stuckTicks: c.stuckTicks || 0,
                    lastPosition: c.lastPosition || { x: c.x, y: c.y },
                    criticallyLowEnergyTicks: c.criticallyLowEnergyTicks || 0,
                    criticallyLowHungerTicks: c.criticallyLowHungerTicks || 0,
                }));

                setSeed(loadedState.seed);
                setGrid(loadedState.grid);
                setDesignations(loadedState.designations);
                setColonists(loadedColonists);
                setStoredMinerals(loadedState.storedMinerals);
                setStoredGems(loadedState.storedGems);
                setStoredLogs(loadedState.storedLogs);
                setStoredStone(loadedState.storedStone || 0);
                setStoredFood(loadedState.storedFood);
                setMilestoneLevel(loadedState.milestoneLevel);
                setCurrentGoal(loadedState.currentGoal);
                setGameTime(loadedState.gameTime);
                setTickCount(loadedState.tickCount);
                setCurrentDay(loadedState.currentDay);
                setCurrentHour(loadedState.currentHour);
                setActiveEvents(loadedState.activeEvents || []);
                setGameLog(loadedState.gameLog || []);
                setColonyName(loadedState.colonyName);
                setAsteroidName(loadedState.asteroidName);
                setChronology(loadedState.chronology);
                setColonistLogs(loadedState.colonistLogs);
                setApiFailed(loadedState.apiFailed || false);

                setSelectedColonist(null);
                setEventPopup(null);
                setIsPlaying(false);
                setShowIntro(false);
                setImportError("Import successful!");
                addLog("Game state imported successfully.");
                setShowSettings(false);
            } catch (error) {
                console.error("Import failed:", error);
                const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
                setImportError(`Import failed: ${errorMessage}`);
                addLog(`Failed to import save file: ${errorMessage}`, 'event');
            }
        };
        reader.readAsText(file);
    };

    useEffect(() => {
        return () => {
            if (unstuckTimeoutRef.current) {
                clearTimeout(unstuckTimeoutRef.current);
            }
        };
    }, []);

    return (
        <div className="bg-gray-900 h-screen flex flex-col font-mono text-white p-2 gap-2">
            {showIntro && <IntroModal onStart={() => {setShowIntro(false); setIsPlaying(true);}} isGenerating={isGenerating} colonyName={colonyName} asteroidName={asteroidName} colonists={colonists} />}
            
            {/* Top Stats Bar */}
            <StatsPanel storedMinerals={storedMinerals} storedGems={storedGems} storedLogs={storedLogs} storedFood={storedFood} storedStone={storedStone} averageHappiness={averageHappiness} workEfficiency={workEfficiency} currentDay={currentDay} currentHour={currentHour} isDay={isDay} milestoneLevel={milestoneLevel} currentGoal={currentGoal}/>
            
            <main className="flex-grow flex flex-row gap-2 overflow-hidden">
              {/* Main Content: Canvas */}
              <div className="flex-grow flex items-center justify-center bg-black border-2 border-gray-600 rounded-md">
                <div className="relative">
                    <canvas ref={canvasRef} style={{ cursor: cursor === 'pickaxe' ? `url(${C.PICKAXE_CURSOR_SVG}), auto` : 'default' }} width={C.GRID_WIDTH * C.TILE_SIZE} height={C.GRID_HEIGHT * C.TILE_SIZE} onMouseDown={handleCanvasMouseDown} onMouseMove={handleCanvasMouseMove} onMouseUp={handleCanvasMouseUp} onMouseLeave={handleCanvasMouseLeave} />
                    {eventPopup && <EventModal event={eventPopup} onContinue={closeEventPopup} />}
                </div>
              </div>
              
              {/* Right Sidebar */}
              <aside className="w-[350px] lg:w-[400px] flex-shrink-0 flex flex-col gap-2 overflow-y-auto pr-1">
                <CombinedInspectorPanel colonist={selectedColonist} tile={hoveredTile} />
                <ColonistWorkLogPanel colonists={colonists} logs={colonistLogs} tickCount={tickCount} onSelect={setSelectedColonist} selectedId={selectedColonist?.id}/>
                <ColonyChronologyPanel chronology={chronology} colonyName={colonyName} asteroidName={asteroidName} isExpanded={expandedPanel === 'chronology'} onToggleExpand={() => setExpandedPanel(p => p === 'chronology' ? 'none' : 'chronology')} />
                <GameLogPanel log={gameLog} isExpanded={expandedPanel === 'log'} onToggleExpand={() => setExpandedPanel(p => p === 'log' ? 'none' : 'log')} />
              </aside>
            </main>
            
            {/* Bottom Controls */}
            <footer className="flex-shrink-0 flex flex-col gap-1">
              <div className="relative">
                <BuildMenu 
                    onSetDesignation={handleSetDesignation}
                    onSetInspect={handleSetInspect}
                    currentMode={interactionMode}
                    designationType={designationType}
                    storedLogs={storedLogs}
                    storedMinerals={storedMinerals}
                    storedStone={storedStone}
                    isPlaying={isPlaying}
                    onTogglePlay={() => setIsPlaying(p => !p)}
                    onRegenerate={() => resetGame(seed)}
                    seed={seed}
                    onSeedChange={(e) => setSeed(e.target.value)}
                    onUnstuck={handleUnstuck}
                    onToggleSettings={() => setShowSettings(s => !s)}
                />
                {showSettings && <SettingsModal onExport={handleExportJson} onImport={handleImportJson} importError={importError} setImportError={setImportError} />}
              </div>
              <Legend />
            </footer>
        </div>
    );
}