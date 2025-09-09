
import React, { useState, useEffect } from 'react';
import { Colonist, Tile } from '../types';
import { MAX_ENERGY, MAX_HAPPINESS } from '../constants';

interface CombinedInspectorPanelProps {
    colonist: Colonist | null;
    tile: Tile | null;
}

export const CombinedInspectorPanel: React.FC<CombinedInspectorPanelProps> = ({ colonist, tile }) => {
    const [activeTab, setActiveTab] = useState('tile');
    
    useEffect(() => {
        if (colonist) {
            setActiveTab('colonist');
        } else {
            setActiveTab('tile');
        }
    }, [colonist]);

    return (
        <div className="w-full h-auto border-2 border-gray-700 bg-gray-800 rounded-md">
            <div className="flex bg-gray-900 rounded-t-md">
                <button onClick={() => setActiveTab('colonist')} className={`flex-1 p-2 text-sm rounded-tl-md ${activeTab === 'colonist' ? 'bg-gray-800 border-b-2 border-cyan-400' : 'bg-gray-900'}`}>Colonist</button>
                <button onClick={() => setActiveTab('tile')} className={`flex-1 p-2 text-sm rounded-tr-md ${activeTab === 'tile' ? 'bg-gray-800 border-b-2 border-cyan-400' : 'bg-gray-900'}`}>Tile</button>
            </div>
            <div className="p-4 min-h-[140px]">
                {activeTab === 'colonist' && (
                    !colonist ? <div className="h-full flex items-center justify-center text-gray-500">Select a colonist</div> :
                    <div>
                        <h3 className="text-lg font-bold text-cyan-400 mb-2">{colonist.id}</h3>
                        <p>Task: <span className="font-semibold text-yellow-300">{colonist.task}</span></p>
                        <div className="my-2">
                            <p className="text-sm">Energy: {colonist.energy.toFixed(0)} / {MAX_ENERGY}</p>
                            <div className="w-full bg-gray-600 rounded-full h-2"><div className="bg-green-500 h-2 rounded-full" style={{ width: `${(colonist.energy / MAX_ENERGY) * 100}%` }}></div></div>
                        </div>
                         <div className="my-2">
                            <p className="text-sm">Happiness: {colonist.happiness.toFixed(0)} / {MAX_HAPPINESS}</p>
                            <div className="w-full bg-gray-600 rounded-full h-2"><div className="bg-purple-500 h-2 rounded-full" style={{ width: `${(colonist.happiness / MAX_HAPPINESS) * 100}%` }}></div></div>
                        </div>
                    </div>
                )}
                {activeTab === 'tile' && (
                    !tile ? <div className="h-full flex items-center justify-center text-gray-500">Hover over a tile</div> :
                    <div>
                        <h3 className="text-lg font-bold text-gray-400 mb-2">Tile Inspector</h3>
                        <p>Type: <span className="font-semibold text-yellow-300">{tile.type}</span></p>
                        <p>Coords: <span className="font-semibold text-gray-300">({tile.x}, {tile.y})</span></p>
                    </div>
                )}
            </div>
        </div>
    );
};
