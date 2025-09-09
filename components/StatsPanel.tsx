
import React from 'react';
import { LOW_MORALE_THRESHOLD } from '../constants';

interface StatsPanelProps {
    storedMinerals: number;
    storedGems: number;
    storedLogs: number;
    averageHappiness: number;
    workEfficiency: number;
    currentDay: number;
    currentHour: number;
    isDay: boolean;
    milestoneLevel: number;
    currentGoal: number;
}

export const StatsPanel: React.FC<StatsPanelProps> = ({ storedMinerals, storedGems, storedLogs, averageHappiness, workEfficiency, currentDay, currentHour, isDay, milestoneLevel, currentGoal }) => (
    <div className="border-2 border-gray-600 bg-gray-800 p-4 rounded-md w-full flex flex-col gap-2">
        <div className="text-center text-lg">Milestone: <span className="font-bold text-green-400">{milestoneLevel}</span></div>
        <div className="text-center text-lg">Minerals: <span className="font-bold text-yellow-400">{storedMinerals} / {currentGoal}</span></div>
        <div className="text-center text-lg">Gems: <span className="font-bold text-purple-400">{storedGems}</span></div>
        <div className="text-center text-lg">Logs: <span className="font-bold text-yellow-600">{storedLogs}</span></div>
        <hr className="border-gray-700"/>
        <div className="text-center text-lg">Avg. Happiness: <span className={`font-bold ${averageHappiness < LOW_MORALE_THRESHOLD ? 'text-red-500' : 'text-green-400'}`}>{averageHappiness.toFixed(0)}%</span></div>
        <div className="text-center text-lg">Work Efficiency: <span className="font-bold text-cyan-400">{workEfficiency.toFixed(1)}%</span></div>
        <hr className="border-gray-700"/>
        <div className="text-center text-lg">Day <span className="font-bold">{currentDay}</span> — {String(currentHour).padStart(2, '0')}:00 {isDay ? <span className="text-yellow-400">☀️</span> : <span className="text-blue-300">🌙</span>}</div>
    </div>
);
