
import React from 'react';
import { ChronologyEntry } from '../types';

interface ColonyChronologyPanelProps {
    chronology: ChronologyEntry[];
    colonyName: string;
    asteroidName: string;
}

export const ColonyChronologyPanel: React.FC<ColonyChronologyPanelProps> = ({ chronology, colonyName, asteroidName }) => (
    <div className="w-full h-40 bg-gray-800 border-2 border-gray-600 p-2 text-xs text-gray-300 overflow-y-scroll flex flex-col-reverse rounded-md">
        <div>
            <div className="p-1 border-b border-yellow-800 mb-2">
                <h3 className="font-bold text-yellow-400 text-center">The Chronicle of {colonyName}</h3>
                <p className="text-xs text-gray-400 text-center">Location: {asteroidName}</p>
            </div>
            {chronology.slice().reverse().map((item, i) => 
                <p key={i} className="whitespace-pre-wrap mb-2">
                    <span className="text-yellow-500">{item.timestamp}</span>: {item.message}
                </p>
            )}
        </div>
    </div>
);
