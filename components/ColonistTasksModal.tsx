import React, { useMemo } from 'react';
import { Colonist, PriorityTask, DesignationType } from '../types';

interface ColonistTasksModalProps {
    colonist: Colonist;
    allTasks: PriorityTask[];
    onClose: () => void;
}

const isTaskDoable = (taskType: DesignationType, colonist: Colonist): boolean => {
    if (taskType.includes('BUILD') || taskType.includes('UPGRADE')) {
        return colonist.roles.includes('BUILDER');
    }
    if (taskType === DesignationType.CHOP || taskType === DesignationType.MINE || taskType === DesignationType.HARVEST) {
        return colonist.roles.includes('MINER');
    }
    return false;
};

const formatTypeName = (type: DesignationType) => {
    return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
};

export const ColonistTasksModal: React.FC<ColonistTasksModalProps> = ({ colonist, allTasks, onClose }) => {
    const eligibleTasks = useMemo(() => {
        return allTasks.filter(task => isTaskDoable(task.type, colonist));
    }, [allTasks, colonist]);

    return (
        <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-30" onClick={onClose}>
            <div className="bg-gray-800 border-2 border-cyan-500 rounded-lg p-6 max-w-md w-full text-center shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-cyan-400">{colonist.name}'s Potential Tasks</h2>
                <p className="text-gray-400 text-sm">
                    This is a list of available tasks this colonist can perform, in order of colony priority.
                </p>
                <div className="bg-gray-900 rounded-md p-2 h-80 overflow-y-auto text-left">
                    {eligibleTasks.length > 0 ? (
                        <ul className="space-y-2">
                            {eligibleTasks.map((task) => {
                                const globalPriority = allTasks.findIndex(t => t.id === task.id) + 1;
                                return (
                                    <li key={task.id} className="p-3 bg-gray-700 rounded-md">
                                        <div className="flex justify-between items-center">
                                            <span className="font-semibold text-gray-200">{formatTypeName(task.type)} at ({task.x}, {task.y})</span>
                                            <span className="text-xs bg-yellow-600 px-2 py-0.5 rounded-full text-yellow-100">Priority #{globalPriority}</span>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <div className="h-full flex items-center justify-center text-gray-500">
                            No available tasks for this colonist's roles.
                        </div>
                    )}
                </div>
                <button onClick={onClose} className="mt-4 px-6 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-md text-lg font-semibold">Close</button>
            </div>
        </div>
    );
};
