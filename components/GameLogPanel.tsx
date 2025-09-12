import React, { useRef, useEffect } from 'react';
import { GameLogItem } from '../types';

interface GameLogPanelProps {
    log: GameLogItem[];
    isExpanded: boolean;
    onToggleExpand: () => void;
}

const ExpandIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
    </svg>
);

const CollapseIcon = () => (
     <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
    </svg>
);


export const GameLogPanel: React.FC<GameLogPanelProps> = ({ log, isExpanded, onToggleExpand }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [log]);
    
    return (
        <div className={`w-full bg-gray-800 border-2 border-gray-600 rounded-md flex flex-col transition-all duration-300 ${isExpanded ? 'flex-grow min-h-40' : 'h-36 flex-shrink-0'}`}>
            <div className="flex items-center p-2 border-b border-gray-700">
                 <h3 className="font-bold text-gray-400 text-center flex-grow">Game Log</h3>
                 <button onClick={onToggleExpand} className="p-1 text-gray-400 hover:text-white" aria-label={isExpanded ? 'Collapse panel' : 'Expand panel'}>
                     {isExpanded ? <CollapseIcon /> : <ExpandIcon />}
                </button>
            </div>
            <div ref={scrollRef} className="p-2 text-xs text-gray-300 overflow-y-auto flex-grow">
                {log.slice().reverse().map((item, i) => <p key={i} className={`whitespace-pre-wrap ${item.type === 'event' ? 'text-purple-400 font-bold' : ''}`}>{item.msg}</p>)}
            </div>
        </div>
    );
};