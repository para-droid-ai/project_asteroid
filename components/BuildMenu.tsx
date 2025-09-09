
import React from 'react';
import { DesignationType, InteractionMode } from '../types';
import { WALL_COST, DOOR_COST, BED_COST, STORAGE_COST } from '../constants';

interface BuildMenuProps {
    onSetDesignation: (type: DesignationType) => void;
    onSetInspect: () => void;
    currentMode: InteractionMode;
    designationType: DesignationType | null;
    storedLogs: number;
}

export const BuildMenu: React.FC<BuildMenuProps> = ({ onSetDesignation, onSetInspect, currentMode, designationType, storedLogs }) => (
    <div className="w-full border-2 border-gray-500 bg-gray-800 p-3 rounded-md">
        <h3 className="text-lg font-bold text-center mb-3">Controls</h3>
        <div className="grid grid-cols-3 gap-2">
            <button onClick={onSetInspect} className={`p-2 rounded ${currentMode === 'INSPECT' ? 'bg-cyan-500' : 'bg-gray-600 hover:bg-gray-700'}`}>Inspect</button>
            <button onClick={() => onSetDesignation(DesignationType.HARVEST)} className={`p-2 rounded ${currentMode === 'DESIGNATE' && designationType === DesignationType.HARVEST ? 'bg-red-500' : 'bg-gray-600 hover:bg-gray-700'}`}>Harvest</button>
            <button onClick={() => onSetDesignation(DesignationType.BUILD_FLOOR)} className={`p-2 rounded ${currentMode === 'DESIGNATE' && designationType === DesignationType.BUILD_FLOOR ? 'bg-green-500' : 'bg-gray-600 hover:bg-gray-700'}`}>Build Floor</button>
            <button onClick={() => onSetDesignation(DesignationType.BUILD_WALL)} disabled={storedLogs < WALL_COST} className={`p-2 rounded ${currentMode === 'DESIGNATE' && designationType === DesignationType.BUILD_WALL ? 'bg-gray-500' : 'bg-gray-600 hover:bg-gray-700'} disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed`}>Build Wall ({WALL_COST} Log)</button>
            <button onClick={() => onSetDesignation(DesignationType.BUILD_DOOR)} disabled={storedLogs < DOOR_COST} className={`p-2 rounded ${currentMode === 'DESIGNATE' && designationType === DesignationType.BUILD_DOOR ? 'bg-yellow-500' : 'bg-gray-600 hover:bg-gray-700'} disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed`}>Build Door ({DOOR_COST} Log)</button>
            <button onClick={() => onSetDesignation(DesignationType.BUILD_BED)} disabled={storedLogs < BED_COST} className={`p-2 rounded ${currentMode === 'DESIGNATE' && designationType === DesignationType.BUILD_BED ? 'bg-red-700' : 'bg-gray-600 hover:bg-gray-700'} disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed`}>Build Bed ({BED_COST} Logs)</button>
            <button onClick={() => onSetDesignation(DesignationType.BUILD_STORAGE)} disabled={storedLogs < STORAGE_COST} className={`p-2 rounded ${currentMode === 'DESIGNATE' && designationType === DesignationType.BUILD_STORAGE ? 'bg-blue-500' : 'bg-gray-600 hover:bg-gray-700'} disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed`}>Build Storage ({STORAGE_COST} Logs)</button>
        </div>
    </div>
);
