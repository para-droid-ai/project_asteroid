
import React from 'react';
import { GameLogItem } from '../types';

interface GameLogPanelProps {
    log: GameLogItem[];
}

export const GameLogPanel: React.FC<GameLogPanelProps> = ({ log }) => (
    <div className="w-full h-64 bg-gray-800 p-2 text-xs text-gray-300 overflow-y-scroll flex flex-col-reverse border-2 border-gray-600 rounded-md">
         <h3 className="font-bold text-gray-400 text-center mb-2 border-b border-gray-700 pb-1">Game Log</h3>
        <div>{log.map((item, i) => <p key={i} className={`whitespace-pre-wrap ${item.type === 'event' ? 'text-purple-400 font-bold' : ''}`}>{item.msg}</p>)}</div>
    </div>
);
