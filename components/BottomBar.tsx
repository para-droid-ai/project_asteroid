import React from 'react';
import { LOW_MORALE_THRESHOLD } from '../constants';
import { Legend } from './Legend';

interface BottomBarProps {
    storedMinerals: number;
    averageHappiness: number;
    workEfficiency: number;
    milestoneLevel: number;
    currentGoal: number;
    totalSoftResets: number;
    totalHardResets: number;
}

export const BottomBar: React.FC<BottomBarProps> = ({ 
    storedMinerals,
    averageHappiness, 
    workEfficiency, 
    milestoneLevel, 
    currentGoal, 
    totalSoftResets, 
    totalHardResets 
}) => (
    <div className="border-t-2 border-gray-700 bg-gray-800 px-4 py-1 w-full flex items-center justify-between text-sm flex-shrink-0">
        <div className="flex items-center gap-x-3">
            <span>Milestone: <span className="font-bold text-green-400">{milestoneLevel}</span></span>
            <span className="text-gray-600">|</span>
            <span>Minerals Goal: <span className="font-bold text-yellow-400">{storedMinerals} / {currentGoal}</span></span>
            <span className="text-gray-600">|</span>
            <span>Avg. Happiness: <span className={`font-bold ${averageHappiness < LOW_MORALE_THRESHOLD ? 'text-red-500' : 'text-green-400'}`}>{averageHappiness.toFixed(0)}%</span></span>
            <span>Work Efficiency: <span className="font-bold text-cyan-400">{workEfficiency.toFixed(1)}%</span></span>
            <span className="text-gray-600">|</span>
            <span title="Automatic task resets due to being stuck">Stuck Resets: <span className="font-bold text-orange-400">{totalSoftResets}</span></span>
            <span title="Emergency teleports due to being severely stuck">Teleports: <span className="font-bold text-red-500">{totalHardResets}</span></span>
        </div>
        <Legend />
    </div>
);
