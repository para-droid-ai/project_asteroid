
import React from 'react';
import { PALETTE } from '../constants';

export const Legend: React.FC = () => (
    <div className="text-gray-500 flex flex-wrap justify-end items-center gap-x-3 gap-y-1 text-xs px-2">
        <span><span style={{color: PALETTE.ROCK}}>#</span>=Rock</span>
        <span><span style={{color: PALETTE.MINERAL}}>*</span>=Mineral</span>
        <span><span style={{color: PALETTE.GEM}}>♦</span>=Gem</span>
        <span><span style={{color: PALETTE.TREE}}>T</span>=Tree</span>
        <span><span style={{color: PALETTE.SAPLING}}>,</span>=Sapling</span>
        <span className="border-l border-gray-700 h-3 mx-1"></span>
        <span><span className="text-blue-500 font-bold">S</span>=Storage</span>
        <span><span className="text-red-500 font-bold">b</span>=Bed</span>
        <span><span style={{color: PALETTE.HYDROPONICS}}>h</span>=Hydroponics</span>
        <span><span style={{color: PALETTE.ARCADE}}>A</span>=Arcade</span>
        <span><span style={{color: PALETTE.WOOD_FLOOR}}>·</span>=W.Floor</span>
        <span><span style={{color: PALETTE.STONE_FLOOR}}>·</span>=S.Floor</span>
        <span><span style={{color: PALETTE.WOOD_WALL}}>■</span>=W.Wall</span>
        <span><span style={{color: PALETTE.STONE_WALL}}>▓</span>=S.Wall</span>
        <span><span style={{color: PALETTE.DOOR}}>+</span>=Door</span>
        <span className="border-l border-gray-700 h-3 mx-1"></span>
        <span><span style={{color: PALETTE.DROPPED_STONE}}>~</span>=Stone</span>
        <span><span className="text-white">@</span>=Idle/Move</span>
        <span><span className="text-white">X</span>=Work</span>
        <span><span className="text-white">o</span>=Haul</span>
        <span><span className="text-white">z</span>=Rest</span>
        <span><span className="text-white">E</span>=Eat</span>
        <span><span className="text-white">P</span>=Play</span>
    </div>
);