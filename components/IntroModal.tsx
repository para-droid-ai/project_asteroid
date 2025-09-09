
import React from 'react';
import { Colonist } from '../types';

interface IntroModalProps {
    onStart: () => void;
    isGenerating: boolean;
    colonyName: string;
    asteroidName: string;
    colonists: Colonist[];
}

export const IntroModal: React.FC<IntroModalProps> = ({ onStart, isGenerating, colonyName, asteroidName, colonists }) => {
    if (isGenerating) {
        return (
             <div className="absolute inset-0 bg-black bg-opacity-85 flex flex-col items-center justify-center z-30 text-center">
                <h1 className="text-4xl font-bold text-cyan-400 mb-4 animate-pulse">[ The Cosmos Stirs... ]</h1>
                <p className="text-gray-300">A new world is being born from the void.</p>
            </div>
        );
    }
    
    return (
        <div className="absolute inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center z-30">
            <div className="bg-gray-800 border-2 border-cyan-500 rounded-lg p-8 max-w-3xl text-center shadow-2xl">
                <h1 className="text-4xl font-bold text-cyan-400 mb-2">Welcome to {colonyName}</h1>
                <p className="text-gray-400 mb-6">Your destination: Asteroid {asteroidName}</p>
                
                <div className="text-left mb-6 bg-gray-900 p-4 rounded-md">
                     <p className="mb-2"><strong className="text-yellow-400">Your Crew:</strong> These souls are all that remain. Their pasts are behind them; their future is in your hands.</p>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-3 my-4">
                        {colonists.map(c => (
                            <div key={c.id} className="bg-gray-800 p-2 rounded">
                                <p className="font-bold text-cyan-300">{c.name}</p>
                                <p className="text-xs text-gray-400 italic">"{c.backstory}"</p>
                            </div>
                        ))}
                     </div>
                     <p><strong className="text-yellow-400">The Goal:</strong> Guide them to sustainability. Designate tasks, manage their needs, and see how long they can last against the harshness of space.</p>
                </div>
                <button onClick={onStart} className="px-8 py-3 bg-cyan-600 hover:bg-cyan-700 rounded-md text-xl font-semibold">Begin Simulation</button>
            </div>
        </div>
    );
};
