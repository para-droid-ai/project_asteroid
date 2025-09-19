import React, { useState } from 'react';
import { DesignationType } from '../types';
import { WALL_COST, DOOR_COST, BED_COST, STORAGE_COST, HYDROPONICS_COST, ARCADE_COST, STONE_FLOOR_COST, STONE_WALL_COST, FLOOR_COST } from '../constants';

// Icons
const InspectIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
const BuildIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"></polygon><line x1="12" y1="22" x2="12" y2="12"></line><polyline points="22 8.5 12 12 2 8.5"></polyline><polyline points="17 14 12 12 7 14"></polyline></svg>;
const OrdersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="14 2 18 6 7 17 3 17 3 13 14 2"></polygon><line x1="3" y1="22" x2="21" y2="22"></line></svg>;
const WorldIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>;
const PrioritiesIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/></svg>;
const SettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 0 2.4l-.15.08a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l-.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1 0-2.4l.15.08a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>;


type Category = 'Inspect' | 'Construction' | 'Orders' | 'World' | null;

interface LeftSidebarProps {
    onSetDesignation: (type: DesignationType) => void;
    onSetInspect: () => void;
    onRegenerate: () => void;
    seed: string;
    onSeedChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onUnstuck: () => void;
    onToggleSettings: () => void;
    onTogglePriorities: () => void;
    onToggleDirector: () => void;
    activeDesignation: DesignationType | null;
}

const CategoryButton = ({ label, icon, onClick, isActive }: { label: string, icon: React.ReactNode, onClick: () => void, isActive: boolean }) => (
    <button onClick={onClick} className={`flex flex-col items-center justify-center w-full p-2 rounded-lg ${isActive ? 'bg-cyan-600' : 'bg-gray-700 hover:bg-gray-600'}`} title={label}>
        {icon}
        <span className="text-xs mt-1">{label}</span>
    </button>
);

const SubMenuButton = ({ label, onClick, isActive, cost }: { label: string, onClick: () => void, isActive: boolean, cost?: string }) => (
    <button onClick={onClick} className={`w-full text-left px-3 py-1.5 rounded text-sm ${isActive ? 'bg-cyan-700' : 'bg-gray-700 hover:bg-gray-600'}`}>
        <div className="font-semibold text-gray-100">{label}</div>
        {cost && <div className="text-xs text-gray-400">{cost}</div>}
    </button>
);

const SubMenuSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div>
        <h4 className="font-bold text-yellow-400 text-sm px-1 mb-1 uppercase">{title}</h4>
        <div className="flex flex-col gap-1">{children}</div>
    </div>
);


export const LeftSidebar: React.FC<LeftSidebarProps> = ({
    onSetDesignation, onSetInspect, onRegenerate, seed, onSeedChange, onUnstuck, onToggleSettings, onTogglePriorities, onToggleDirector, activeDesignation
}) => {
    const [activeCategory, setActiveCategory] = useState<Category>('Inspect');

    const handleCategoryClick = (category: Category) => {
        if (category === 'Inspect') {
            onSetInspect();
        }
        setActiveCategory(category);
    };

    const renderSubMenu = () => {
        switch (activeCategory) {
            case 'Construction':
                return (
                    <div className="flex flex-col gap-4">
                        <SubMenuSection title="Floors">
                            <SubMenuButton label="Wood Floor" onClick={() => onSetDesignation(DesignationType.BUILD_WOOD_FLOOR)} isActive={activeDesignation === DesignationType.BUILD_WOOD_FLOOR} cost={`${FLOOR_COST}L`} />
                            <SubMenuButton label="Stone Floor" onClick={() => onSetDesignation(DesignationType.BUILD_STONE_FLOOR)} isActive={activeDesignation === DesignationType.BUILD_STONE_FLOOR} cost={`${STONE_FLOOR_COST}S`} />
                            <SubMenuButton label="Upgrade Floor" onClick={() => onSetDesignation(DesignationType.UPGRADE_TO_STONE_FLOOR)} isActive={activeDesignation === DesignationType.UPGRADE_TO_STONE_FLOOR} cost={`${STONE_FLOOR_COST}S`} />
                        </SubMenuSection>
                        <SubMenuSection title="Walls">
                            <SubMenuButton label="Wood Wall" onClick={() => onSetDesignation(DesignationType.BUILD_WOOD_WALL)} isActive={activeDesignation === DesignationType.BUILD_WOOD_WALL} cost={`${WALL_COST}L`} />
                            <SubMenuButton label="Stone Wall" onClick={() => onSetDesignation(DesignationType.BUILD_STONE_WALL)} isActive={activeDesignation === DesignationType.BUILD_STONE_WALL} cost={`${STONE_WALL_COST}S`} />
                             <SubMenuButton label="Upgrade Wall" onClick={() => onSetDesignation(DesignationType.UPGRADE_TO_STONE_WALL)} isActive={activeDesignation === DesignationType.UPGRADE_TO_STONE_WALL} cost={`${STONE_WALL_COST}S`} />
                            <SubMenuButton label="Door" onClick={() => onSetDesignation(DesignationType.BUILD_DOOR)} isActive={activeDesignation === DesignationType.BUILD_DOOR} cost={`${DOOR_COST}L`} />
                        </SubMenuSection>
                         <SubMenuSection title="Furniture">
                            <SubMenuButton label="Bed" onClick={() => onSetDesignation(DesignationType.BUILD_BED)} isActive={activeDesignation === DesignationType.BUILD_BED} cost={`${BED_COST}L`} />
                            <SubMenuButton label="Storage" onClick={() => onSetDesignation(DesignationType.BUILD_STORAGE)} isActive={activeDesignation === DesignationType.BUILD_STORAGE} cost={`${STORAGE_COST}L`} />
                        </SubMenuSection>
                        <SubMenuSection title="Facilities">
                             <SubMenuButton label="Hydroponics" onClick={() => onSetDesignation(DesignationType.BUILD_HYDROPONICS)} isActive={activeDesignation === DesignationType.BUILD_HYDROPONICS} cost={`${HYDROPONICS_COST.logs}L, ${HYDROPONICS_COST.stone}S, ${HYDROPONICS_COST.minerals}M`} />
                             <SubMenuButton label="Arcade" onClick={() => onSetDesignation(DesignationType.BUILD_ARCADE)} isActive={activeDesignation === DesignationType.BUILD_ARCADE} cost={`${ARCADE_COST.logs}L, ${ARCADE_COST.stone}S, ${ARCADE_COST.minerals}M, ${ARCADE_COST.gems}G`} />
                        </SubMenuSection>
                    </div>
                );
            case 'Orders':
                return (
                     <SubMenuSection title="Mass Orders">
                        <SubMenuButton label="Harvest" onClick={() => onSetDesignation(DesignationType.HARVEST)} isActive={activeDesignation === DesignationType.HARVEST} />
                    </SubMenuSection>
                );
            case 'World':
                 return (
                     <div className="flex flex-col gap-4">
                        <SubMenuSection title="Simulation Control">
                            <SubMenuButton label="Priorities" onClick={onTogglePriorities} isActive={false} />
                            <SubMenuButton label="AI Director" onClick={onToggleDirector} isActive={false} />
                        </SubMenuSection>
                    </div>
                );
            default:
                return <div className="text-center text-gray-500 p-4">Select a category</div>;
        }
    };

    return (
        <aside className="flex-shrink-0 flex flex-row bg-gray-900 border-y-2 border-l-2 border-gray-700">
            <div className="w-24 bg-gray-800/50 p-2 border-r-2 border-gray-700 flex flex-col gap-2">
                <CategoryButton label="Inspect" icon={<InspectIcon/>} onClick={() => handleCategoryClick('Inspect')} isActive={activeCategory === 'Inspect'} />
                <CategoryButton label="Build" icon={<BuildIcon/>} onClick={() => handleCategoryClick('Construction')} isActive={activeCategory === 'Construction'} />
                <CategoryButton label="Orders" icon={<OrdersIcon/>} onClick={() => handleCategoryClick('Orders')} isActive={activeCategory === 'Orders'} />
                <CategoryButton label="World" icon={<WorldIcon/>} onClick={() => handleCategoryClick('World')} isActive={activeCategory === 'World'} />

                <div className="flex-grow"></div>
                 <div className="flex flex-col gap-2">
                    <button onClick={onUnstuck} className="px-3 py-1 rounded bg-orange-700 hover:bg-orange-600 text-sm">Unstuck</button>
                    <div className="flex items-center gap-1">
                        <input type="text" value={seed} onChange={onSeedChange} className="bg-gray-900 border border-gray-600 rounded px-2 py-1 w-full text-xs" placeholder="seed..."/>
                    </div>
                    <button onClick={onRegenerate} className="px-3 py-1 rounded bg-gray-600 hover:bg-gray-500 text-sm">Regen</button>
                    <button onClick={onToggleSettings} className="p-1.5 rounded bg-gray-600 hover:bg-gray-500 flex justify-center">
                        <SettingsIcon />
                    </button>
                </div>
            </div>
            <div className="w-64 bg-gray-800/20 p-3 overflow-y-auto">
                {renderSubMenu()}
            </div>
        </aside>
    );
};
