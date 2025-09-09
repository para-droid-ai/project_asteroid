
import React from 'react';
import { GameEvent } from '../types';

interface EventModalProps {
    event: GameEvent;
    onContinue: () => void;
}

export const EventModal: React.FC<EventModalProps> = ({ event, onContinue }) => (
    <div className="absolute inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center z-20">
        <div className="bg-gray-800 border-2 border-purple-500 rounded-lg p-8 max-w-sm text-center shadow-lg">
            <h2 className="text-2xl font-bold text-purple-400 mb-4">Event Occurred!</h2>
            <p className="text-white mb-6">{event.message}</p>
            <button onClick={onContinue} className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-md text-lg font-semibold">Continue</button>
        </div>
    </div>
);
