
import React from 'react';
import { GameEvent } from '../types';

interface EventsPanelProps {
    events: GameEvent[];
}

export const EventsPanel: React.FC<EventsPanelProps> = ({ events }) => {
    if (events.length === 0) return null;
    return (
        <div className="border-2 border-purple-500 bg-gray-800 p-3 rounded-md w-full flex flex-col gap-1">
            <h3 className="text-lg font-bold text-center text-purple-400 mb-1">Active Events</h3>
            {events.map(event => (
                <div key={event.id} className="text-center text-sm text-purple-300">{event.message.split('!')[0]}</div>
            ))}
        </div>
    );
};
