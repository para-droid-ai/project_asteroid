
import React from 'react';
import { GameLogItem } from '../types';

interface GameLogPanelProps {
    log: GameLogItem[];
}

export const GameLogPanel: React.FC<GameLogPanelProps> = ({ log }) => (
    <div className="w-full h-48 border-2 border-gray-500 bg-gray-800 p-2 rounded-md text-xs text-gray-300 overflow-y-scroll flex flex-col-reverse">
        <div>{log.map((item, i) => <p key={i} className={`whitespace-pre-wrap ${item.type === 'event' ? 'text-purple-400 font-bold' : ''}`}>{item.msg}</p>)}</div>
    </div>
);
