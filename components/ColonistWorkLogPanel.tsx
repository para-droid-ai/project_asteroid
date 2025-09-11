import React from 'react';
import { Colonist, ColonistLog } from '../types';
import { COLONIST_LOG_COLORS } from '../constants';

interface ColonistWorkLogPanelProps {
    colonists: Colonist[];
    logs: ColonistLog[];
    tickCount: number;
    onSelect: (colonist: Colonist) => void;
    selectedId: string | undefined;
}

export const ColonistWorkLogPanel: React.FC<ColonistWorkLogPanelProps> = ({ colonists, logs, tickCount, onSelect, selectedId }) => {
    const timelineLength = 100;
    const startTick = Math.max(0, tickCount - timelineLength);
    const activityKey = [ {color: "#facc15", label: "Mining"}, {color: "#4ade80", label: "Building"}, {color: "#854d0e", label: "Chopping"}, {color: "#fde047", label: "Hauling"}, {color: "#818cf8", label: "Resting"}, {color: "#6b7280", label: "Idle"}, {color: "#d1d5db", label: "Moving"} ];

    return (
        <div className="flex flex-col bg-gray-800 p-2 border-2 border-gray-600 rounded-md">
            <div className="overflow-y-auto pr-2">
                {colonists.map((col, idx) => {
                    const logForColonist = logs[idx];
                    if (!logForColonist || logForColonist.length === 0) {
                        return (
                             <div key={col.id} onClick={() => onSelect(col)} className={`flex items-center mb-1 p-1 rounded cursor-pointer ${selectedId === col.id ? 'bg-cyan-700' : 'hover:bg-gray-700'}`}>
                                <span className={`inline-block mr-2 w-4 h-4 rounded-full ${COLONIST_LOG_COLORS[idx % COLONIST_LOG_COLORS.length]}`}/>
                                <span className="w-24 text-xs font-semibold">{col.name}</span>
                                <div className="flex-1 flex items-center bg-gray-900 rounded-sm overflow-hidden h-4 italic text-xs text-gray-500 justify-center">No log data</div>
                             </div>
                        )
                    }
                    return (
                        <div key={col.id} onClick={() => onSelect(col)} className={`flex items-center mb-1 p-1 rounded cursor-pointer ${selectedId === col.id ? 'bg-cyan-700' : 'hover:bg-gray-700'}`}>
                            <span className={`inline-block mr-2 w-4 h-4 rounded-full ${COLONIST_LOG_COLORS[idx % COLONIST_LOG_COLORS.length]}`}/>
                            <span className="w-24 text-xs font-semibold">{col.name}</span>
                            <div className="flex-1 flex items-center bg-gray-900 rounded-sm overflow-hidden">
                                {[...Array(timelineLength).keys()].map(i => {
                                    const tick = startTick + i;
                                    const entry = logForColonist[tick % logForColonist.length];

                                    let color = "#111827"; let task = "No Data";
                                    if (entry) {
                                        task = entry.task;
                                        if (task.includes("MINE")) color = activityKey[0].color;
                                        else if (task.includes("BUILD")) color = activityKey[1].color;
                                        else if (task.includes("CHOP")) color = activityKey[2].color;
                                        else if (task.includes("HAUL") || task.includes("STORAGE")) color = activityKey[3].color;
                                        else if (task.includes("REST")) color = activityKey[4].color;
                                        else if (task === "IDLE") color = activityKey[5].color;
                                        else if (task.startsWith("MOVING")) color = activityKey[6].color;
                                    }
                                    return <span key={i} className="inline-block h-4 w-full flex-1" style={{ background: color }} title={`${task} at tick ${tick}`} />;
                                })}
                            </div>
                        </div>
                    )
                })}
            </div>
             <div className="text-xs pt-2 text-center text-gray-400 flex flex-wrap justify-center gap-x-3 gap-y-1">
               {activityKey.map(k => <span key={k.label}><span className="w-2 h-2 inline-block rounded-full mr-1" style={{backgroundColor: k.color}}></span>{k.label}</span>)}
            </div>
        </div>
    );
};