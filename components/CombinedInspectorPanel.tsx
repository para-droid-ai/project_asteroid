import React from 'react';
import { Colonist, Tile, TileType, ColonistRole } from '../types';
import { MAX_ENERGY, MAX_HAPPINESS, MAX_HUNGER, MAX_BOREDOM, CROP_GROWTH_DURATION, SAPLING_TO_TREE_TICKS } from '../constants';

interface CombinedInspectorPanelProps {
    colonist: Colonist | null;
    tile: Tile | null;
    onUpdateColonistRoles: (colonistId: string, roles: ColonistRole[]) => void;
}

const StatBar = ({ label, value, max, colorClass }: { label: string, value: number, max: number, colorClass: string }) => {
    const percentage = max > 0 ? (value / max) * 100 : 0;
    return (
        <div>
            <p className="text-sm flex justify-between">
                <span>{label}</span>
                <span className="font-semibold text-gray-300">{value.toFixed(0)} / {max}</span>
            </p>
            <div className="w-full bg-slate-700 rounded-full h-2 mt-1">
                <div className={`${colorClass} h-2 rounded-full`} style={{ width: `${percentage}%` }}></div>
            </div>
        </div>
    );
};

const RoleCheckbox = ({ role, isChecked, onChange }: { role: string, isChecked: boolean, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) => (
    <label className="flex items-center space-x-2 text-xs cursor-pointer">
        <input type="checkbox" checked={isChecked} onChange={onChange} className="form-checkbox h-4 w-4 rounded bg-gray-700 border-gray-600 text-cyan-600 focus:ring-cyan-500" />
        <span>{role}</span>
    </label>
);

export const CombinedInspectorPanel: React.FC<CombinedInspectorPanelProps> = ({ colonist, tile, onUpdateColonistRoles }) => {
    if (colonist) {
        const handleRoleChange = (role: ColonistRole) => {
            const newRoles = colonist.roles.includes(role)
                ? colonist.roles.filter(r => r !== role)
                : [...colonist.roles, role];
            onUpdateColonistRoles(colonist.id, newRoles);
        };

        return (
            <div className="w-full border-2 border-gray-700 bg-gray-800 rounded-md p-3 space-y-2 relative flex-shrink-0">
                <div className="absolute top-2 right-3 text-xs text-gray-400 text-right">
                    <p title="Automatic task resets due to being stuck">Stuck Resets: <span className="font-semibold text-orange-400">{colonist.softResetCount || 0}</span></p>
                    <p title="Emergency teleports due to being severely stuck">Teleports: <span className="font-semibold text-red-500">{colonist.hardResetCount || 0}</span></p>
                </div>
                <p className="text-lg font-bold text-cyan-400">{colonist.name}</p>
                <p className="text-sm">Task: <span className="font-semibold text-yellow-300">{colonist.task}</span></p>

                <div className="space-y-1 pt-1">
                    <StatBar label="Energy" value={colonist.energy} max={MAX_ENERGY} colorClass="bg-green-500" />
                    <StatBar label="Happiness" value={colonist.happiness} max={MAX_HAPPINESS} colorClass="bg-lime-500" />
                    <StatBar label="Hunger" value={colonist.hunger} max={MAX_HUNGER} colorClass="bg-orange-500" />
                    <StatBar label="Boredom" value={colonist.boredom} max={MAX_BOREDOM} colorClass="bg-pink-500" />
                </div>

                <div className="border-t border-gray-700 pt-2">
                    <p className="text-sm font-semibold text-gray-400 mb-1">Roles:</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        <RoleCheckbox role="Cook" isChecked={colonist.roles.includes('COOK')} onChange={() => handleRoleChange('COOK')} />
                        <RoleCheckbox role="Builder" isChecked={colonist.roles.includes('BUILDER')} onChange={() => handleRoleChange('BUILDER')} />
                        <RoleCheckbox role="Miner" isChecked={colonist.roles.includes('MINER')} onChange={() => handleRoleChange('MINER')} />
                        <RoleCheckbox role="Hauler" isChecked={colonist.roles.includes('HAULER')} onChange={() => handleRoleChange('HAULER')} />
                    </div>
                </div>
            </div>
        );
    }
    
    if (tile) {
        return (
            <div className="w-full border-2 border-gray-700 bg-gray-800 rounded-md p-4 space-y-2 min-h-[268px] flex-shrink-0">
                <p className="text-lg font-bold text-cyan-400">Tile Info</p>
                <p>Type: <span className="font-semibold text-yellow-300">{tile.type}</span></p>
                <p>Coords: <span className="text-gray-400">({tile.x}, {tile.y})</span></p>
                {tile.growth !== undefined && tile.type === TileType.HYDROPONICS_TRAY && (
                    <StatBar label="Growth" value={tile.growth} max={CROP_GROWTH_DURATION} colorClass="bg-green-600" />
                )}
                {tile.type === TileType.SAPLING && (
                    <StatBar label="Maturing" value={tile.regrowthTicks} max={SAPLING_TO_TREE_TICKS} colorClass="bg-lime-700" />
                )}
            </div>
        );
    }

    return (
        <div className="w-full border-2 border-gray-700 bg-gray-800 rounded-md p-4 min-h-[268px] flex items-center justify-center text-gray-500 flex-shrink-0">
            <p>Select a colonist or hover over a tile to inspect</p>
        </div>
    );
};
