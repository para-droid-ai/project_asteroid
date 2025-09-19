import React, { useRef, useEffect, useState, useCallback, useReducer } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { Colonist, ColonistLog, Designations, DesignationType, GameEvent, GameLogItem, Grid, InteractionMode, Point, Tile, TileType, ChronologyEntry, PriorityTask, ColonistRole, SimulationSettings, GameState } from './types';
import * as C from './constants';
import { initialStoryFallbacks } from './utils/fallbackData';
import { createPRNG } from './utils/noise';
import { gameReducer, initialState, ActionType } from './reducer';

import { IntroModal } from './components/IntroModal';
import { TopBar } from './components/TopBar';
import { LeftSidebar } from './components/LeftSidebar';
import { EventModal } from './components/EventModal';
import { SettingsModal } from './components/SettingsModal';
import { CombinedInspectorPanel } from './components/CombinedInspectorPanel';
import { GameLogPanel } from './components/GameLogPanel';
import { ColonistWorkLogPanel } from './components/ColonistWorkLogPanel';
import { ColonyChronologyPanel } from './components/ColonyChronologyPanel';
import { PriorityTasksModal } from './components/PriorityTasksModal';
import { ColonyAlertsPanel } from './components/ColonyAlertsPanel';
import { DirectorModal } from './components/DirectorModal';
import { BottomBar } from './components/BottomBar';
import { ColonistTasksModal } from './components/ColonistTasksModal';

const generateInitialStory = async (dispatch: React.Dispatch<any>): Promise<{ colonyName: string; asteroidName: string; firstEntry: string; colonists: { name: string; backstory: string }[] }> => {
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
        if (dispatch) {
            dispatch({ type: ActionType.SET_API_FAILED, payload: true });
        }
        return initialStoryFallbacks[Math.floor(Math.random() * initialStoryFallbacks.length)];
    }
};

export default function App() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [gameState, dispatch] = useReducer(gameReducer, initialState);
    
    const [isPlaying, setIsPlaying] = useState(false);
    const [gameSpeed, setGameSpeed] = useState(1);
    const [showIntro, setShowIntro] = useState(true);
    const [selectedColonist, setSelectedColonist] = useState<Colonist | null>(null);
    const [hoveredTile, setHoveredTile] = useState<Tile | null>(null);
    const [workEfficiency, setWorkEfficiency] = useState(100);
    const [eventPopup, setEventPopup] = useState<GameEvent | null>(null);
    const [interactionMode, setInteractionMode] = useState<InteractionMode>('INSPECT');
    const [designationType, setDesignationType] = useState<DesignationType | null>(null);
    const [importError, setImportError] = useState("");
    const [showSettings, setShowSettings] = useState(false);
    const [cursor, setCursor] = useState('default');
    
    const [isGenerating, setIsGenerating] = useState(true);
    const [isNarrating, setIsNarrating] = useState(false);
    const [expandedPanel, setExpandedPanel] = useState<'chronology' | 'log' | 'none'>('chronology');
    const [unstuckPressCount, setUnstuckPressCount] = useState(0);
    const unstuckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [showPrioritiesModal, setShowPrioritiesModal] = useState(false);
    const [isEventGenerationRunning, setIsEventGenerationRunning] = useState(false);
    const [showDirectorModal, setShowDirectorModal] = useState(false);
    const [showColonistTaskModal, setShowColonistTaskModal] = useState(false);
    const [taskModalColonist, setTaskModalColonist] = useState<Colonist | null>(null);

    const isDesignating = useRef(false);
    const designationStart = useRef<Point | null>(null);
    const designationDragStart = useRef<Designations | null>(null);

    const { grid, designations, colonists, tickCount, averageHappiness, storedFood, storedMinerals, storedLogs, storedStone, colonyName, asteroidName, chronology, apiFailed, simulationSettings } = gameState;
    const isDay = (gameState.currentHour >= 7 && gameState.currentHour < 19);
    
    const dispatchLog = useCallback((message: string, type: 'standard' | 'event' = 'standard') => {
        dispatch({ type: ActionType.ADD_LOG, payload: { message, type } });
    }, []);

    const resetGame = useCallback(async (newSeed?: string) => {
        setIsGenerating(true);
        setShowIntro(true);
        setIsPlaying(false);
        setImportError("");
        const seedToUse = newSeed || Date.now().toString().slice(-4);
        
        dispatchLog(`Generating new asteroid with seed: ${seedToUse}...`);
        
        const storyData = await generateInitialStory(dispatch);
        
        dispatch({
            type: ActionType.RESET_GAME,
            payload: {
                seed: seedToUse,
                storyData,
            }
        });

        dispatchLog(`Simulation started. Welcome to ${storyData.colonyName}.`);
        dispatchLog('A small supply cache was found, providing 15 logs.');
        setIsGenerating(false);
    }, [dispatchLog]);

    useEffect(() => { resetGame(); }, [resetGame]);

    useEffect(() => {
        if (!isPlaying || !gameState.grid || gameState.grid.length === 0 || showIntro || eventPopup) return;
        const intervalId = setInterval(() => dispatch({ type: ActionType.TICK }), C.GAME_TICK_MS / gameSpeed);
        return () => clearInterval(intervalId);
    }, [isPlaying, gameState.grid, showIntro, eventPopup, gameSpeed]);

    useEffect(() => {
        if (selectedColonist && !gameState.colonists.find(c => c.id === selectedColonist.id)) {
            setSelectedColonist(null);
        } else if (selectedColonist) {
             const updatedSelected = gameState.colonists.find(c => c.id === selectedColonist.id);
             setSelectedColonist(updatedSelected || null);
        }
    }, [gameState.colonists, selectedColonist]);

    const summarizeGameState = useCallback(() => {
        const happinessStatus = averageHappiness > 70 ? "high" : averageHappiness > 40 ? "stable" : "low";
        const resourceStatus = (storedFood < 10) ? "critically low" : (storedMinerals < 10 && storedLogs < 10) ? "low" : "stable";
        
        let recentActions: { [key: string]: number } = {};
        colonists.forEach((c, idx) => {
            const log = gameState.colonistLogs[idx];
            if (!log) return;
            const recentTicks = log.slice(Math.max(0, tickCount - 50), tickCount);
            recentTicks.forEach(entry => {
                if (entry) {
                    const genericTask = entry.task.split('_')[0];
                    recentActions[genericTask] = (recentActions[genericTask] || 0) + 1;
                }
            });
        });
        
        const dominantActivity = Object.keys(recentActions).length > 0 ? Object.entries(recentActions).reduce((a, b) => a[1] > b[1] ? a : b)[0] : "idling";

        return `Day ${gameState.currentDay}, ${String(gameState.currentHour).padStart(2, '0')}:00. Morale is ${happinessStatus} (${averageHappiness.toFixed(0)}%). Food reserves are ${resourceStatus}. The colonists are primarily focused on ${dominantActivity.toLowerCase()}.`;

    }, [averageHappiness, storedMinerals, storedLogs, storedFood, colonists, gameState.colonistLogs, tickCount, gameState.currentDay, gameState.currentHour]);

    const generateChronicleUpdate = useCallback(async () => {
        if(isNarrating || apiFailed) return;
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
                 dispatch({ type: ActionType.ADD_CHRONOLOGY, payload: parsed.newEntry });
            }
        } catch (error) {
            console.error("Failed to generate chronicle update:", error);
            dispatchLog("AI Narrator API limit may be reached. Chronicle will now show placeholder updates. This does not affect gameplay.", "event");
            dispatch({ type: ActionType.SET_API_FAILED, payload: true });
        } finally {
            setIsNarrating(false);
        }

    }, [chronology, summarizeGameState, isNarrating, apiFailed, dispatchLog]);

    useEffect(() => {
        if (tickCount > 0 && tickCount % 750 === 0 && !isNarrating) {
            generateChronicleUpdate();
        }
    }, [tickCount, isNarrating, generateChronicleUpdate]);

    const generateDailyEvent = useCallback(async (): Promise<GameEvent | null> => {
        if (apiFailed) { // Fallback logic if API failed before
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
                if (event.id === 'NEW_COLONIST' && !simulationSettings.allowNewColonists) return null;
                return event;
            }
            return null;
        }

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        const summary = summarizeGameState();

        let possibleEvents = ['METEOR_SHOWER', 'HIGH_MORALE', 'PRODUCTIVITY_BOOST', 'MINOR_SETBACK', 'TRAGIC_ACCIDENT', 'NO_EVENT'];
        if (simulationSettings.allowNewColonists) {
            possibleEvents.push('NEW_COLONIST');
        }

        const prompt = `You are an AI Event Director for a sci-fi colony simulation game. Your role is to act as an intelligent "dungeon master," triggering events that are contextually relevant to the colony's current situation.
        
        CURRENT COLONY STATUS:
        ${summary}
        Number of colonists: ${colonists.length}

        Based on the status, decide if an event should occur today.
        - If things are going too well (high morale, lots of resources), consider a minor setback.
        - If the colony is struggling (low food, low morale), consider a helpful event or a challenging one to increase tension. A 'NEW_COLONIST' event can be good, but not if food is critically low. A 'TRAGIC_ACCIDENT' should be rare and only used if there are more than 2 colonists.
        - Sometimes, no event is the best choice to let the player stabilize. There should be a good chance of no event.

        Your response must be a single JSON object. Choose one eventType from this list: ${possibleEvents.join(', ')}. If you choose 'NO_EVENT', the message can be empty.
        
        Provide your response in this exact JSON format:
        {
          "shouldTrigger": boolean, // true if an event should happen, false otherwise.
          "eventType": "string", // One of the event types from the list. If shouldTrigger is false, this should be 'NO_EVENT'.
          "message": "string" // A creative, short message for the player announcing the event.
        }`;
    
        try {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            shouldTrigger: { type: Type.BOOLEAN },
                            eventType: { type: Type.STRING, enum: possibleEvents },
                            message: { type: Type.STRING }
                        },
                        required: ["shouldTrigger", "eventType", "message"]
                    }
                }
            });
    
            const jsonText = response.text.trim();
            const parsed: { shouldTrigger: boolean; eventType: string; message: string } = JSON.parse(jsonText);
    
            if (parsed.shouldTrigger && parsed.eventType !== 'NO_EVENT') {
                if (parsed.eventType === 'TRAGIC_ACCIDENT' && colonists.length <= 1) return null;
                if (parsed.eventType === 'NEW_COLONIST' && (storedFood < 10 || !simulationSettings.allowNewColonists)) return null;
                
                const eventDurations: { [key: string]: number } = {
                    'HIGH_MORALE': C.DAY_LENGTH_TICKS / 2,
                    'PRODUCTIVITY_BOOST': C.DAY_LENGTH_TICKS / 2,
                    'MINOR_SETBACK': C.DAY_LENGTH_TICKS / 2,
                    'METEOR_SHOWER': 1, 'NEW_COLONIST': 1, 'TRAGIC_ACCIDENT': 1,
                };
    
                return {
                    id: parsed.eventType,
                    duration: eventDurations[parsed.eventType] || 1,
                    message: parsed.message,
                    type: 'event',
                    pauses: true
                };
            }
            return null;
        } catch (error) {
            console.error("Error generating daily event from Gemini:", error);
            dispatchLog("AI Event Director failed. Events will be disabled.", "event");
            dispatch({ type: ActionType.SET_API_FAILED, payload: true });
            return null;
        }
    }, [summarizeGameState, colonists.length, storedFood, dispatchLog, simulationSettings, apiFailed]);
    
    const closeEventPopup = useCallback(async () => {
        const event = eventPopup;
        if (!event) {
            setIsPlaying(true);
            return;
        }
        
        setEventPopup(null);
    
        if (event.id === 'NEW_COLONIST') {
             if (colonists.length >= C.INITIAL_COLONIST_COUNT + 10) {
                dispatchLog("Cannot support any more colonists at this time.", "event");
             } else {
                const storyData = await generateInitialStory(dispatch);
                const newColonistData = storyData.colonists[0];
                dispatch({ type: ActionType.ADD_COLONIST, payload: newColonistData });
             }
        } else if (event.id === 'TRAGIC_ACCIDENT') {
            dispatch({ type: ActionType.TRIGGER_ACCIDENT });
        } else if (event.id === 'METEOR_SHOWER') {
            dispatch({ type: ActionType.TRIGGER_METEOR_SHOWER });
        } else {
             dispatch({ type: ActionType.ADD_EVENT, payload: event });
        }
        
        setIsPlaying(true);
    }, [eventPopup, colonists.length, dispatchLog, dispatch]);
    
    useEffect(() => {
        if (isPlaying && !isEventGenerationRunning && tickCount > 0 && (tickCount % C.DAY_LENGTH_TICKS) === 1) {
            setIsEventGenerationRunning(true);
            generateDailyEvent().then(event => {
                if (event) {
                    dispatchLog(event.message, 'event');
                    setEventPopup(event);
                    setIsPlaying(false);
                }
                setIsEventGenerationRunning(false);
            });
        }
    }, [tickCount, isPlaying, generateDailyEvent, isEventGenerationRunning, dispatchLog]);

    useEffect(() => {
        if (!gameState.colonistLogs || gameState.colonistLogs.length === 0 || !gameState.colonistLogs[0] || gameState.colonistLogs[0].length === 0) return;
        let totalProductiveTicks = 0;
        let totalTicksConsidered = 0;
        gameState.colonistLogs.forEach(log => {
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
    }, [gameState.colonistLogs, tickCount]);

    useEffect(() => {
        if (!grid || grid.length === 0 || !canvasRef.current) return;
        const canvas = canvasRef.current; const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.fillStyle = isDay ? C.PALETTE.BACKGROUND : C.PALETTE.NIGHT;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.globalAlpha = 0.5;
        ctx.font = "10px monospace";
        const patternColors = ['#a855f7', '#eab308']; // purple, yellow
        const patternPrng = createPRNG(gameState.seed + "_pattern");

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
        ctx.globalAlpha = 1.0; 

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
            const isCritical = c.criticallyLowHungerTicks > 0 || c.criticallyLowEnergyTicks > 0;
            const flash = isCritical && tickCount % 10 < 5;

            ctx.fillStyle = flash ? C.PALETTE.CRITICAL_NEED_FLASH : (selectedColonist && c.id === selectedColonist.id) ? C.PALETTE.COLONIST_SELECTED : C.PALETTE.COLONIST;
            
            let char = C.CHARS.COLONIST;
            if(c.task === 'MINING' || c.task === 'BUILDING' || c.task === 'CHOPPING') char = C.CHARS.COLONIST_WORKING; if(c.carrying) char = C.CHARS.COLONIST_HAULING; if(c.task === 'RESTING') char = C.CHARS.COLONIST_RESTING; if(c.task === 'EATING') char = C.CHARS.COLONIST_EATING; if(c.task === 'PLAYING') char = C.CHARS.COLONIST_PLAYING;
            ctx.fillText(char, drawX, drawY);
        });
    }, [grid, colonists, selectedColonist, designations, isDay, gameState.seed, tickCount]);

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
            dispatch({ type: ActionType.SET_DESIGNATION, payload: { start: coords, end: coords, type: designationType } });
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
        
        if (interactionMode === 'DESIGNATE' && isDesignating.current && designationStart.current && coords && designationType) {
            dispatch({ type: ActionType.SET_DESIGNATION, payload: { start: designationStart.current, end: coords, type: designationType, dragStartDesignations: designationDragStart.current! } });
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
            dispatch({ type: ActionType.SOFT_RESET_COLONISTS });
            dispatchLog('All colonists soft-reset. Press again to teleport to safety.', 'event');

        } else if (newPressCount >= 2) {
            dispatch({ type: ActionType.HARD_RESET_COLONISTS });
            dispatchLog('Emergency reset: Colonists teleported and needs replenished.', 'event');
            setUnstuckPressCount(0);
        }
        
        unstuckTimeoutRef.current = setTimeout(() => {
            setUnstuckPressCount(0);
        }, 2000);
    };

    const handleExportJson = () => {
        const stateToSave = { ...gameState };
        const jsonString = JSON.stringify(stateToSave, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${colonyName.replace(/\s/g, '_')}_Day${gameState.currentDay}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        dispatchLog("Game state exported.");
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
                const loadedState: GameState = JSON.parse(text);

                if (!loadedState.grid || !loadedState.colonists || !loadedState.version) {
                    throw new Error("Invalid save file format.");
                }
                if (loadedState.version !== C.GAME_VERSION) {
                    throw new Error(`Incompatible save version. Expected ${C.GAME_VERSION}, got ${loadedState.version}.`);
                }

                dispatch({ type: ActionType.LOAD_GAME, payload: loadedState });

                setSelectedColonist(null);
                setEventPopup(null);
                setIsPlaying(false);
                setShowIntro(false);
                setImportError("Import successful!");
                dispatchLog("Game state imported successfully.");
                setShowSettings(false);
            } catch (error) {
                console.error("Import failed:", error);
                const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
                setImportError(`Import failed: ${errorMessage}`);
                dispatchLog(`Failed to import save file: ${errorMessage}`, 'event');
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

    const handleViewColonistTasks = (colonist: Colonist) => {
        setTaskModalColonist(colonist);
        setShowColonistTaskModal(true);
    };

    const lowFoodAlert = gameState.storedFood < colonists.length * 3;
    const starvationAlert = colonists.some(c => c.criticallyLowHungerTicks > 0);

    return (
        <div className="bg-gray-900 h-screen flex flex-col text-white overflow-hidden">
            {showIntro && <IntroModal onStart={() => {setShowIntro(false); setIsPlaying(true);}} isGenerating={isGenerating} colonyName={colonyName} asteroidName={asteroidName} colonists={colonists} />}
            {showPrioritiesModal && <PriorityTasksModal tasks={gameState.priorityTasks} onReorder={(tasks) => dispatch({type: ActionType.REORDER_PRIORITY_TASKS, payload: tasks})} onClose={() => setShowPrioritiesModal(false)} />}
            {showDirectorModal && <DirectorModal settings={simulationSettings} onUpdateSettings={(settings) => dispatch({ type: ActionType.UPDATE_SIMULATION_SETTINGS, payload: settings })} onClose={() => setShowDirectorModal(false)} />}
            {showColonistTaskModal && taskModalColonist && (
                <ColonistTasksModal
                    colonist={taskModalColonist}
                    allTasks={gameState.priorityTasks}
                    onClose={() => {
                        setShowColonistTaskModal(false);
                        setTaskModalColonist(null);
                    }}
                />
            )}
            
            <TopBar 
                storedMinerals={gameState.storedMinerals} storedGems={gameState.storedGems} storedLogs={gameState.storedLogs} 
                storedFood={gameState.storedFood} storedStone={gameState.storedStone} currentDay={gameState.currentDay} currentHour={gameState.currentHour} 
                isDay={isDay} colonists={colonists} onSelectColonist={setSelectedColonist}
                selectedColonistId={selectedColonist?.id} gameSpeed={gameSpeed} onSetGameSpeed={setGameSpeed}
                isPlaying={isPlaying} onTogglePlay={() => setIsPlaying(p => !p)}
            />
            
            <div className="flex flex-row flex-grow overflow-auto relative">
                <LeftSidebar
                    onSetDesignation={handleSetDesignation}
                    onSetInspect={handleSetInspect}
                    onRegenerate={() => resetGame(gameState.seed)}
                    seed={gameState.seed}
                    onSeedChange={(e) => dispatch({ type: ActionType.SET_SEED, payload: e.target.value })}
                    onUnstuck={handleUnstuck}
                    onToggleSettings={() => setShowSettings(s => !s)}
                    onTogglePriorities={() => setShowPrioritiesModal(p => !p)}
                    onToggleDirector={() => setShowDirectorModal(p => !p)}
                    activeDesignation={interactionMode === 'DESIGNATE' ? designationType : null}
                />
                {showSettings && <div className="absolute left-[350px] bottom-2 z-30"><SettingsModal onExport={handleExportJson} onImport={handleImportJson} importError={importError} setImportError={setImportError} /></div>}
              
              <main className="flex-grow flex items-center justify-center bg-black border-y-2 border-l-2 border-gray-700 relative">
                <ColonyAlertsPanel lowFood={lowFoodAlert} starvationImminent={starvationAlert} />
                <div className="relative">
                    <canvas ref={canvasRef} style={{ cursor: cursor === 'pickaxe' ? `url(${C.PICKAXE_CURSOR_SVG}), auto` : 'default' }} width={C.GRID_WIDTH * C.TILE_SIZE} height={C.GRID_HEIGHT * C.TILE_SIZE} onMouseDown={handleCanvasMouseDown} onMouseMove={handleCanvasMouseMove} onMouseUp={handleCanvasMouseUp} onMouseLeave={handleCanvasMouseLeave} />
                    {eventPopup && <EventModal event={eventPopup} onContinue={closeEventPopup} />}
                </div>
              </main>
              
              <aside className="w-[350px] lg:w-[400px] flex-shrink-0 flex flex-col gap-2 p-2 border-y-2 border-r-2 border-gray-700 bg-gray-900 overflow-y-auto">
                <CombinedInspectorPanel colonist={selectedColonist} tile={hoveredTile} onUpdateColonistRoles={(id, roles) => dispatch({ type: ActionType.UPDATE_COLONIST_ROLES, payload: { id, roles } })} onViewTasks={handleViewColonistTasks} />
                <ColonistWorkLogPanel colonists={colonists} logs={gameState.colonistLogs} tickCount={tickCount} onSelect={setSelectedColonist} selectedId={selectedColonist?.id}/>
                <div className="flex-grow flex flex-col gap-2 overflow-hidden">
                    <ColonyChronologyPanel chronology={chronology} colonyName={colonyName} asteroidName={asteroidName} isExpanded={expandedPanel === 'chronology'} onToggleExpand={() => setExpandedPanel(p => p === 'chronology' ? 'none' : 'chronology')} />
                    <GameLogPanel log={gameState.gameLog} isExpanded={expandedPanel === 'log'} onToggleExpand={() => setExpandedPanel(p => p === 'log' ? 'none' : 'log')} />
                </div>
              </aside>
            </div>
             <BottomBar
                milestoneLevel={gameState.milestoneLevel}
                currentGoal={gameState.currentGoal}
                storedMinerals={gameState.storedMinerals}
                averageHappiness={averageHappiness}
                workEfficiency={workEfficiency}
                totalSoftResets={gameState.colonyStats.softResets}
                totalHardResets={gameState.colonyStats.hardResets}
            />
        </div>
    );
}