
import React from 'react';
import { PALETTE } from '../constants';

export const Legend: React.FC = () => (
    <div className="text-gray-400 mt-4 flex flex-wrap justify-center items-center gap-x-3 gap-y-1 text-sm bg-gray-800 p-2 rounded-md">
        <span><span style={{color: PALETTE.ROCK}}>#</span>=Rock</span>
        <span><span style={{color: PALETTE.MINERAL}}>*</span>=Mineral</span>
        <span><span style={{color: PALETTE.GEM}}>♦</span>=Gem</span>
        <span><span style={{color: PALETTE.TREE}}>T</span>=Tree</span>
        <span><span style={{color: PALETTE.SAPLING}}>,</span>=Sapling</span>
        <span className="border-l border-gray-600 h-4 mx-1"></span>
        <span><span className="text-blue-500 font-bold">S</span>=Storage</span>
        <span><span className="text-red-500 font-bold">b</span>=Bed</span>
        <span><span className="font-bold" style={{color: PALETTE.FLOOR}}>·</span>=Floor</span>
        <span><span className="font-bold" style={{color: PALETTE.WALL}}>■</span>=Wall</span>
        <span><span className="font-bold" style={{color: PALETTE.DOOR}}>+</span>=Door</span>
        <span className="border-l border-gray-600 h-4 mx-1"></span>
        <span><span className="text-white font-bold">@</span>=Idle/Move</span>
        <span><span className="text-white font-bold">X</span>=Work</span>
        <span><span className="text-white font-bold">o</span>=Haul</span>
        <span><span className="text-white font-bold">z</span>=Rest</span>
    </div>
);
