import React from 'react';

interface ColonyAlertsPanelProps {
    lowFood: boolean;
    starvationImminent: boolean;
}

export const ColonyAlertsPanel: React.FC<ColonyAlertsPanelProps> = ({ lowFood, starvationImminent }) => {
    const alerts = [];
    if (starvationImminent) {
        alerts.push({ id: 'starvation', message: 'STARVATION IMMINENT', level: 'critical' });
    } else if (lowFood) {
        alerts.push({ id: 'lowfood', message: 'LOW FOOD SUPPLY', level: 'warning' });
    }

    if (alerts.length === 0) return null;

    return (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 w-max">
            {alerts.map(alert => {
                const colors = alert.level === 'critical' 
                    ? 'bg-red-900/80 border-red-600 text-red-300' 
                    : 'bg-yellow-900/80 border-yellow-600 text-yellow-300';
                return (
                    <div key={alert.id} className={`px-4 py-2 rounded-md border text-center font-bold animate-pulse ${colors}`}>
                        ⚠️ {alert.message}
                    </div>
                );
            })}
        </div>
    );
};
