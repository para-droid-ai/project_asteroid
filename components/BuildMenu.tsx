import React from 'react';
import { DesignationType, InteractionMode } from '../types';
import { WALL_COST, DOOR_COST, BED_COST, STORAGE_COST, HYDROPONICS_COST, ARCADE_COST, STONE_FLOOR_COST, STONE_WALL_COST, FLOOR_COST } from '../constants';

interface BuildMenuProps {
    onSetDesignation: (type: DesignationType) => void;
    onSetInspect: () => void;
    currentMode: InteractionMode;
    designationType: DesignationType | null;
    storedLogs: number;
    storedMinerals: number;
    storedStone: number;
    isPlaying: boolean;
    onTogglePlay: () => void;
    onRegenerate: () => void;
    seed: string;
    onSeedChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onUnstuck: () => void;
    onToggleSettings: () => void;
    onTogglePriorities: () => void;
}

const SettingsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 0 2.4l-.15.08a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1 0-2.4l.15.08a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
);

export const BuildMenu: React.FC<BuildMenuProps> = ({ 
    onSetDesignation, onSetInspect, currentMode, designationType, storedLogs, storedMinerals, storedStone,
    isPlaying, onTogglePlay, onRegenerate, seed, onSeedChange, onUnstuck, onToggleSettings, onTogglePriorities
}) => (
    <div className="w-full border-y-2 border-gray-700 bg-gray-800 p-2 flex items-center gap-2 text-sm">
        <div className="flex items-center gap-1 flex-wrap">
            {/* General */}
            <button onClick={onSetInspect} className={`px-3 py-1 rounded ${currentMode === 'INSPECT' ? 'bg-cyan-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>Inspect</button>
            <button onClick={() => onSetDesignation(DesignationType.HARVEST)} className={`px-3 py-1 rounded ${currentMode === 'DESIGNATE' && designationType === DesignationType.HARVEST ? 'bg-cyan-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>Harvest</button>
             <button onClick={onTogglePriorities} className="px-3 py-1 rounded bg-yellow-700 hover:bg-yellow-600">Priorities</button>
            <div className="h-5 border-l border-gray-600 mx-1"></div>
            
            {/* Wood Construction */}
            <button onClick={() => onSetDesignation(DesignationType.BUILD_WOOD_FLOOR)} className={`px-3 py-1 rounded ${currentMode === 'DESIGNATE' && designationType === DesignationType.BUILD_WOOD_FLOOR ? 'bg-cyan-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>Wood Floor ({FLOOR_COST}L)</button>
            <button onClick={() => onSetDesignation(DesignationType.BUILD_WOOD_WALL)} className={`px-3 py-1 rounded ${currentMode === 'DESIGNATE' && designationType === DesignationType.BUILD_WOOD_WALL ? 'bg-cyan-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>Wood Wall ({WALL_COST}L)</button>
            <div className="h-5 border-l border-gray-600 mx-1"></div>

            {/* Stone Construction & Upgrades */}
            <button onClick={() => onSetDesignation(DesignationType.BUILD_STONE_FLOOR)} className={`px-3 py-1 rounded ${currentMode === 'DESIGNATE' && designationType === DesignationType.BUILD_STONE_FLOOR ? 'bg-cyan-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>Stone Floor ({STONE_FLOOR_COST}S)</button>
            <button onClick={() => onSetDesignation(DesignationType.BUILD_STONE_WALL)} className={`px-3 py-1 rounded ${currentMode === 'DESIGNATE' && designationType === DesignationType.BUILD_STONE_WALL ? 'bg-cyan-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>Stone Wall ({STONE_WALL_COST}S)</button>
            <button onClick={() => onSetDesignation(DesignationType.UPGRADE_TO_STONE_FLOOR)} className={`px-3 py-1 rounded ${currentMode === 'DESIGNATE' && designationType === DesignationType.UPGRADE_TO_STONE_FLOOR ? 'bg-cyan-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>Upg. Floor ({STONE_FLOOR_COST}S)</button>
            <button onClick={() => onSetDesignation(DesignationType.UPGRADE_TO_STONE_WALL)} className={`px-3 py-1 rounded ${currentMode === 'DESIGNATE' && designationType === DesignationType.UPGRADE_TO_STONE_WALL ? 'bg-cyan-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>Upg. Wall ({STONE_WALL_COST}S)</button>
            <div className="h-5 border-l border-gray-600 mx-1"></div>

            {/* Furniture */}
            <button onClick={() => onSetDesignation(DesignationType.BUILD_DOOR)} className={`px-3 py-1 rounded ${currentMode === 'DESIGNATE' && designationType === DesignationType.BUILD_DOOR ? 'bg-cyan-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>Door ({DOOR_COST}L)</button>
            <button onClick={() => onSetDesignation(DesignationType.BUILD_BED)} className={`px-3 py-1 rounded ${currentMode === 'DESIGNATE' && designationType === DesignationType.BUILD_BED ? 'bg-cyan-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>Bed ({BED_COST}L)</button>
            <button onClick={() => onSetDesignation(DesignationType.BUILD_STORAGE)} className={`px-3 py-1 rounded ${currentMode === 'DESIGNATE' && designationType === DesignationType.BUILD_STORAGE ? 'bg-cyan-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>Storage ({STORAGE_COST}L)</button>
            <button onClick={() => onSetDesignation(DesignationType.BUILD_HYDROPONICS)} className={`px-3 py-1 rounded ${currentMode === 'DESIGNATE' && designationType === DesignationType.BUILD_HYDROPONICS ? 'bg-cyan-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>Hydroponics ({HYDROPONICS_COST.logs}L, {HYDROPONICS_COST.stone}S, {HYDROPONICS_COST.minerals}M)</button>
            <button onClick={() => onSetDesignation(DesignationType.BUILD_ARCADE)} className={`px-3 py-1 rounded ${currentMode === 'DESIGNATE' && designationType === DesignationType.BUILD_ARCADE ? 'bg-cyan-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>Arcade ({ARCADE_COST.logs}L, {ARCADE_COST.stone}S, {ARCADE_COST.minerals}M, {ARCADE_COST.gems}G)</button>
        </div>

        <div className="flex-grow"></div>

        <div className="flex items-center gap-2">
             <button onClick={onUnstuck} className="px-3 py-1 rounded bg-orange-700 hover:bg-orange-600">Unstuck</button>
             <div className="flex items-center gap-1">
                <button onClick={onRegenerate} className="px-3 py-1 rounded bg-gray-600 hover:bg-gray-500">Regen</button>
                <input type="text" value={seed} onChange={onSeedChange} className="bg-gray-900 border border-gray-600 rounded px-2 py-1 w-24 text-xs" placeholder="seed..."/>
            </div>
            <button onClick={onTogglePlay} className="px-4 py-1 rounded bg-blue-600 hover:bg-blue-500 font-semibold w-20">{isPlaying ? 'Pause' : 'Play'}</button>
            <button onClick={onToggleSettings} className="p-1.5 rounded bg-gray-600 hover:bg-gray-500">
                <SettingsIcon />
            </button>
        </div>
    </div>
);