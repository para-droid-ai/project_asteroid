
import React from 'react';
import { Colonist } from '../types';
import { COLONIST_LOG_COLORS } from '../constants';

interface ColonistQuickSelectPanelProps {
    colonists: Colonist[];
    onSelect: (colonist: Colonist) => void;
    selectedId: string | undefined;
}

export const ColonistQuickSelectPanel: React.FC<ColonistQuickSelectPanelProps> = ({colonists, onSelect, selectedId}) => (
    <div className="w-full border-2 border-gray-700 bg-gray-800 p-2 rounded-md flex flex-col gap-1">
        <h3 className="text-md font-bold text-center text-gray-400 mb-1">Colonists ({colonists.length})</h3>
        {colonists.map((c, i) => (
            <button key={c.id} onClick={() => onSelect(c)} className={`w-full text-left px-3 py-1 rounded text-sm ${selectedId === c.id ? 'bg-cyan-600' : 'bg-gray-700 hover:bg-gray-600'}`}>
                <span className={`inline-block mr-2 w-3 h-3 rounded-full ${COLONIST_LOG_COLORS[i % COLONIST_LOG_COLORS.length]}`}/>
                {c.id}
            </button>
        ))}
    </div>
);
