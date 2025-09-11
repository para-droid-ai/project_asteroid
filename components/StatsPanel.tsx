import React from 'react';
import { LOW_MORALE_THRESHOLD } from '../constants';

interface StatsPanelProps {
    storedMinerals: number;
    storedGems: number;
    storedLogs: number;
    storedFood: number;
    storedStone: number;
    averageHappiness: number;
    workEfficiency: number;
    currentDay: number;
    currentHour: number;
    isDay: boolean;
    milestoneLevel: number;
    currentGoal: number;
    totalSoftResets: number;
    totalHardResets: number;
}

export const StatsPanel: React.FC<StatsPanelProps> = ({ 
    storedMinerals, storedGems, storedLogs, storedFood, storedStone, 
    averageHappiness, workEfficiency, currentDay, currentHour, isDay, 
    milestoneLevel, currentGoal, totalSoftResets, totalHardResets 
}) => (
    <div className="border-b-2 border-gray-700 bg-gray-800 px-4 py-1 w-full flex items-center justify-between text-sm flex-shrink-0">
        <div className="flex items-center gap-x-4">
            <span>Milestone: <span className="font-bold text-green-400">{milestoneLevel}</span></span>
            <span className="text-gray-500">|</span>
            <span>Minerals: <span className="font-bold text-yellow-400">{storedMinerals} / {currentGoal}</span></span>
            <span>Gems: <span className="font-bold text-purple-400">{storedGems}</span></span>
            <span>Logs: <span className="font-bold text-yellow-600">{storedLogs}</span></span>
            <span>Stone: <span className="font-bold text-gray-400">{storedStone}</span></span>
            <span>Food: <span className="font-bold text-red-400">{storedFood}</span></span>
        </div>
        <div className="flex items-center gap-x-4">
            <span>Avg. Happiness: <span className={`font-bold ${averageHappiness < LOW_MORALE_THRESHOLD ? 'text-red-500' : 'text-green-400'}`}>{averageHappiness.toFixed(0)}%</span></span>
            <span>Work Efficiency: <span className="font-bold text-cyan-400">{workEfficiency.toFixed(1)}%</span></span>
             <span className="text-gray-500">|</span>
            <span title="Automatic task resets due to being stuck">Stuck Resets: <span className="font-bold text-orange-400">{totalSoftResets}</span></span>
            <span title="Emergency teleports due to being severely stuck">Teleports: <span className="font-bold text-red-500">{totalHardResets}</span></span>
        </div>
        <div className="flex items-center gap-x-2 font-bold">
            <span>Day {currentDay}</span>
            <span>—</span>
            <span>{String(currentHour).padStart(2, '0')}:00</span>
            <span className="text-xl">{isDay ? <span title="Day" className="text-yellow-300">☀️</span> : <span title="Night" className="text-blue-300">🌙</span>}</span>
        </div>
    </div>
);