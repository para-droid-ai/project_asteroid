
import React from 'react';

interface IntroModalProps {
    onStart: () => void;
}

export const IntroModal: React.FC<IntroModalProps> = ({ onStart }) => (
    <div className="absolute inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center z-30">
        <div className="bg-gray-800 border-2 border-cyan-500 rounded-lg p-8 max-w-2xl text-center shadow-2xl">
            <h1 className="text-4xl font-bold text-cyan-400 mb-4">[PROJECT ASTEROID]</h1>
            <p className="text-gray-300 mb-6">
                Your small crew has been marooned on a desolate asteroid. Survival is your only objective.
            </p>
            <div className="text-left mb-6 bg-gray-900 p-4 rounded-md">
                 <p className="mb-2"><strong className="text-yellow-400">Your Colonists Are Autonomous:</strong> They will automatically try to survive. Their first priority is to build a shelter, which has been pre-designated for them. They will seek out trees for logs to complete it.</p>
                 <p className="mb-2"><strong className="text-yellow-400">Your Role:</strong> Guide them by designating tasks. Mark rocks and minerals for harvesting, build new structures, and manage the colony's expansion.</p>
                 <p><strong className="text-yellow-400">The Goal:</strong> Reach mining milestones to prove the colony is sustainable. See how long you can last against the harshness of space!</p>
            </div>
            <button onClick={onStart} className="px-8 py-3 bg-cyan-600 hover:bg-cyan-700 rounded-md text-xl font-semibold">Begin</button>
        </div>
    </div>
);
