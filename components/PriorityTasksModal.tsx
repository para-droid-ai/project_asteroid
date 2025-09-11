import React, { useState, useRef } from 'react';
import { PriorityTask } from '../types';

interface PriorityTasksModalProps {
    tasks: PriorityTask[];
    onReorder: (tasks: PriorityTask[]) => void;
    onClose: () => void;
}

export const PriorityTasksModal: React.FC<PriorityTasksModalProps> = ({ tasks, onReorder, onClose }) => {
    const [localTasks, setLocalTasks] = useState(tasks);
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
        if (clickedIndex === 0) return; // Already at the top
        const newTasks = [...localTasks];
        const [clickedTask] = newTasks.splice(clickedIndex, 1);
        newTasks.unshift(clickedTask);
        setLocalTasks(newTasks);
        onReorder(newTasks);
    };

    const formatTaskName = (task: PriorityTask) => {
        const typeName = task.type.replace(/_/g, ' ').toLowerCase();
        return `[${typeName}] at (${task.x}, ${task.y})`;
    }

    return (
        <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-30" onClick={onClose}>
            <div className="bg-gray-800 border-2 border-yellow-500 rounded-lg p-6 max-w-lg w-full text-center shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-yellow-400">Colony Task Priorities</h2>
                <p className="text-gray-400 text-sm">Drag and drop tasks to change their priority. Top of the list is highest priority. Double-click to move to top.</p>
                <div className="bg-gray-900 rounded-md p-2 h-96 overflow-y-auto">
                    {localTasks.length > 0 ? (
                        <ul className="space-y-2">
                            {localTasks.map((task, index) => (
                                <li
                                    key={task.id}
                                    className="p-3 bg-gray-700 rounded-md cursor-grab text-left text-sm"
                                    draggable
                                    onDoubleClick={() => handleDoubleClick(index)}
                                    onDragStart={(e) => handleDragStart(e, index)}
                                    onDragEnter={(e) => handleDragEnter(e, index)}
                                    onDragEnd={handleDragEnd}
                                    onDragOver={(e) => e.preventDefault()}
                                >
                                    <span className="font-bold text-cyan-400">{index + 1}. </span>
                                    {formatTaskName(task)}
                                </li>
                            ))}
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
