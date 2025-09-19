import React from 'react';
import { SimulationSettings } from '../types';

interface DirectorModalProps {
    settings: SimulationSettings;
    onUpdateSettings: (newSettings: SimulationSettings) => void;
    onClose: () => void;
}

const Toggle = ({ label, isEnabled, onToggle, description }: { label: string, isEnabled: boolean, onToggle: () => void, description: string }) => (
    <div className="flex items-start justify-between bg-gray-700 p-3 rounded-md">
        <div>
            <label className="font-semibold text-gray-200">{label}</label>
            <p className="text-xs text-gray-400 mt-1">{description}</p>
        </div>
        <button
            onClick={onToggle}
            className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-cyan-500 ${isEnabled ? 'bg-cyan-600' : 'bg-gray-600'}`}
            aria-checked={isEnabled}
        >
            <span
                className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${isEnabled ? 'translate-x-6' : 'translate-x-1'}`}
            />
        </button>
    </div>
);

export const DirectorModal: React.FC<DirectorModalProps> = ({ settings, onUpdateSettings, onClose }) => {
    
    const handleToggleNewColonists = () => {
        onUpdateSettings({ ...settings, allowNewColonists: !settings.allowNewColonists });
    };

    return (
        <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-30" onClick={onClose}>
            <div className="bg-gray-800 border-2 border-purple-500 rounded-lg p-6 max-w-lg w-full text-center shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-purple-400">AI Director Controls</h2>
                <p className="text-gray-400 text-sm">Fine-tune the AI's behavior to customize your simulation experience. Changes will apply to future events.</p>
                <div className="text-left space-y-3 pt-2">
                    <Toggle
                        label="Allow New Colonists"
                        isEnabled={settings.allowNewColonists}
                        onToggle={handleToggleNewColonists}
                        description="Enable or disable the 'New Colonist' random event. Disabling this can help manage late-game population."
                    />
                </div>
                <button onClick={onClose} className="mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-md text-lg font-semibold">Close</button>
            </div>
        </div>
    );
};
