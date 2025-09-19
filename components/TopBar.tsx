import React from 'react';
import { Colonist } from '../types';
import { LOW_MORALE_THRESHOLD } from '../constants';

// SVG Icon Components
const LogIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 10L16 12C16 13.1046 15.1046 14 14 14L9 14C7.89543 14 7 13.1046 7 12L7 7C7 5.89543 7.89543 5 9 5L14 5C15.1046 5 16 5.89543 16 7" stroke="#966947" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 14V17C12 18.1046 11.1046 19 10 19L7 19" stroke="#966947" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const StoneIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15 11L14 16L9 18L7 13L9 9L15 11Z" stroke="#a1a1aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M15 11C15 11 17.2727 12.3636 18 13C18.7273 13.6364 20 13 20 12C20 11 18 10 18 10C18 10 16 9 15 11Z" stroke="#a1a1aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const MineralIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="#facc15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const GemIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L6 8L12 22L18 8L12 2Z" stroke="#9333ea" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M6 8H18" stroke="#9333ea" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M10 8L12 22L14 8" stroke="#9333ea" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const FoodIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C12 2 4 4 4 10C4 16 12 22 12 22C12 22 20 16 20 10C20 4 12 2 12 2Z" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 6C13.1046 6 14 5.10457 14 4C14 2.89543 13.1046 2 12 2C10.8954 2 10 2.89543 10 4C10 5.10457 10.8954 6 12 6Z" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;

interface TopBarProps {
    storedMinerals: number;
    storedGems: number;
    storedLogs: number;
    storedFood: number;
    storedStone: number;
    currentDay: number;
    currentHour: number;
    isDay: boolean;
    colonists: Colonist[];
    onSelectColonist: (colonist: Colonist) => void;
    selectedColonistId: string | undefined;
    gameSpeed: number;
    onSetGameSpeed: (speed: number) => void;
    isPlaying: boolean;
    onTogglePlay: () => void;
}

const ResourceItem = ({ icon, value }: { icon: React.ReactNode, value: number }) => (
    <div className="flex items-center gap-1 bg-black/30 px-2 py-0.5 rounded">
        {icon}
        <span className="font-bold text-lg">{value}</span>
    </div>
);

const SpeedButton = ({ speed, currentSpeed, setSpeed }: { speed: number, currentSpeed: number, setSpeed: (s: number) => void }) => (
    <button
        onClick={() => setSpeed(speed)}
        className={`w-8 h-8 flex items-center justify-center rounded ${currentSpeed === speed ? 'bg-cyan-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}
    >
        {speed}x
    </button>
);


export const TopBar: React.FC<TopBarProps> = ({
    storedMinerals, storedGems, storedLogs, storedFood, storedStone,
    currentDay, currentHour, isDay,
    colonists, onSelectColonist, selectedColonistId,
    gameSpeed, onSetGameSpeed, isPlaying, onTogglePlay
}) => {
    return (
        <header className="w-full bg-gray-900 border-b-2 border-gray-700 px-4 py-1 flex items-center justify-between flex-shrink-0">
            {/* Left: Resources */}
            <div className="flex items-center gap-3">
                <ResourceItem icon={<LogIcon />} value={storedLogs} />
                <ResourceItem icon={<StoneIcon />} value={storedStone} />
                <ResourceItem icon={<MineralIcon />} value={storedMinerals} />
                <ResourceItem icon={<GemIcon />} value={storedGems} />
                <ResourceItem icon={<FoodIcon />} value={storedFood} />
            </div>

            {/* Center: Colonist Bar */}
            <div className="flex items-center gap-1">
                {colonists.map(c => (
                    <button
                        key={c.id}
                        onClick={() => onSelectColonist(c)}
                        className={`px-3 py-1 rounded border-2 ${selectedColonistId === c.id ? 'bg-cyan-700 border-cyan-400' : 'bg-gray-700/80 border-gray-600 hover:bg-gray-600'}`}
                        title={c.name}
                    >
                        {c.name}
                    </button>
                ))}
            </div>

            {/* Right: Time and Speed */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-x-2 font-bold text-xl">
                    <span>Day {currentDay}</span>
                    <span>-</span>
                    <span>{String(currentHour).padStart(2, '0')}:00</span>
                    <span className="text-2xl" title={isDay ? 'Day' : 'Night'}>{isDay ? '☀️' : '🌙'}</span>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={onTogglePlay} className={`w-11 h-8 flex items-center justify-center rounded ${isPlaying ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}>
                        {isPlaying ? '❚❚' : '▶'}
                    </button>
                    <SpeedButton speed={1} currentSpeed={gameSpeed} setSpeed={onSetGameSpeed} />
                    <SpeedButton speed={2} currentSpeed={gameSpeed} setSpeed={onSetGameSpeed} />
                    <SpeedButton speed={3} currentSpeed={gameSpeed} setSpeed={onSetGameSpeed} />
                </div>
            </div>
        </header>
    );
};
