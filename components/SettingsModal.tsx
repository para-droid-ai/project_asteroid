
import React from 'react';

interface SettingsModalProps {
    onExport: () => void;
    onImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
    importError: string;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onExport, onImport, importError }) => (
    <div className="absolute bottom-14 right-0 bg-gray-800 border-2 border-gray-600 p-4 rounded-lg shadow-xl flex flex-col gap-2 w-48 z-20">
         <label className="px-4 py-2 rounded bg-green-700 hover:bg-green-800 cursor-pointer text-center">
            Import Save
            <input type="file" accept=".json" onChange={onImport} className="hidden"/>
        </label>
        <button onClick={onExport} className="px-4 py-2 rounded bg-yellow-700 hover:bg-yellow-800">Export Save</button>
        {importError && <div className={`mt-1 text-xs ${importError.startsWith("Import failed") ? "text-red-400" : "text-green-400"}`}>{importError}</div>}
    </div>
);
