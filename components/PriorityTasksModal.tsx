import React, { useState, useRef, useMemo } from 'react';
import { PriorityTask, DesignationType } from '../types';

interface PriorityTasksModalProps {
    tasks: PriorityTask[];
    onReorder: (tasks: PriorityTask[]) => void;
    onClose: () => void;
}

const ChevronIcon = ({ isExpanded }: { isExpanded: boolean }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
        <polyline points="9 18 15 12 9 6"></polyline>
    </svg>
);


export const PriorityTasksModal: React.FC<PriorityTasksModalProps> = ({ tasks, onReorder, onClose }) => {
    const [localTasks, setLocalTasks] = useState(tasks);
    const [collapsedGroups, setCollapsedGroups] = useState<Set<DesignationType>>(new Set());
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

    const handleDragStart = (e: React.DragEvent<HTMLLIElement>, index: number) => {
        dragItem.current = index;
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragEnter = (e: React.DragEvent<HTMLLIElement>, index: number) => {
        if (dragItem.current === null || dragItem.current === index) return;
        dragOverItem.current = index;
        const newTasks = [...localTasks];
        const draggedItemContent = newTasks.splice(dragItem.current!, 1)[0];
        newTasks.splice(dragOverItem.current!, 0, draggedItemContent);
        dragItem.current = dragOverItem.current;
        dragOverItem.current = null;
        setLocalTasks(newTasks);
    };

    const handleDragEnd = () => {
        onReorder(localTasks);
        dragItem.current = null;
        dragOverItem.current = null;
    };
    
    const handleDoubleClick = (clickedIndex: number) => {
        if (clickedIndex === 0) return;
        const newTasks = [...localTasks];
        const [clickedTask] = newTasks.splice(clickedIndex, 1);
        newTasks.unshift(clickedTask);
        setLocalTasks(newTasks);
        onReorder(newTasks);
    };

    const toggleGroup = (type: DesignationType) => {
        setCollapsedGroups(prev => {
            const newSet = new Set(prev);
            if (newSet.has(type)) {
                newSet.delete(type);
            } else {
                newSet.add(type);
            }
            return newSet;
        });
    };

    const formatTypeName = (type: DesignationType) => {
        return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    };

    const groupedTasks = useMemo(() => {
        return localTasks.reduce((acc, task) => {
            const group = acc.get(task.type) || [];
            group.push(task);
            acc.set(task.type, group);
            return acc;
        }, new Map<DesignationType, PriorityTask[]>());
    }, [localTasks]);


    return (
        <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-30" onClick={onClose}>
            <div className="bg-gray-800 border-2 border-yellow-500 rounded-lg p-6 max-w-lg w-full text-center shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-yellow-400">Colony Task Priorities</h2>
                <p className="text-gray-400 text-sm">Drag and drop tasks to change their priority. Top of the list is highest priority. Double-click to move to top.</p>
                <div className="bg-gray-900 rounded-md p-2 h-96 overflow-y-auto">
                    {localTasks.length > 0 ? (
                        <ul className="space-y-1">
                           {Array.from(groupedTasks.entries()).map(([type, tasksInGroup]) => {
                               const isExpanded = !collapsedGroups.has(type);
                               return (
                                <li key={type} className="bg-gray-900/50 rounded">
                                    <div onClick={() => toggleGroup(type)} className="flex items-center cursor-pointer sticky top-0 bg-gray-900 p-2 rounded hover:bg-gray-800/60" role="button" aria-expanded={isExpanded}>
                                        <ChevronIcon isExpanded={isExpanded} />
                                        <h3 className="text-lg font-semibold text-yellow-500 ml-1 text-left">{formatTypeName(type)} ({tasksInGroup.length})</h3>
                                    </div>
                                    {isExpanded && (
                                        <ul className="space-y-2 pl-6 pr-2 py-2">
                                            {tasksInGroup.map((task) => {
                                                const globalIndex = localTasks.findIndex(t => t.id === task.id);
                                                return (
                                                    <li
                                                        key={task.id}
                                                        className="p-3 bg-gray-700 rounded-md cursor-grab text-left text-sm"
                                                        draggable
                                                        onDoubleClick={() => handleDoubleClick(globalIndex)}
                                                        onDragStart={(e) => handleDragStart(e, globalIndex)}
                                                        onDragEnter={(e) => handleDragEnter(e, globalIndex)}
                                                        onDragEnd={handleDragEnd}
                                                        onDragOver={(e) => e.preventDefault()}
                                                    >
                                                        <span className="font-bold text-cyan-400">{globalIndex + 1}. </span>
                                                        {`Coords (${task.x}, ${task.y})`}
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    )}
                                </li>
                           )})}
                        </ul>
                    ) : (
                        <div className="h-full flex items-center justify-center text-gray-500">
                            No active designations.
                        </div>
                    )}
                </div>
                <button onClick={onClose} className="mt-4 px-6 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-md text-lg font-semibold">Close</button>
            </div>
        </div>
    );
};