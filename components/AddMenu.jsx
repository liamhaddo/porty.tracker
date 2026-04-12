'use client';

import { Upload, PlusCircle } from 'lucide-react';

export default function AddMenu({ onClose, onImportCsv, onAddHolding, themeColour = '#6366f1' }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Add to Portfolio</h2>
        <p className="text-xs text-gray-400 mb-4">Choose how you'd like to add positions.</p>

        <div className="space-y-2">
          {/* Import CSV */}
          <button
            onClick={() => { onClose(); onImportCsv(); }}
            className="w-full flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors text-left group"
          >
            <div className="w-9 h-9 rounded-lg bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center shrink-0 transition-colors">
              <Upload size={17} className="text-gray-600" strokeWidth={2} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Import CSV</p>
              <p className="text-xs text-gray-400">Upload a transactions file from your broker</p>
            </div>
          </button>

          {/* Add Holding manually */}
          <button
            onClick={() => { onClose(); onAddHolding(); }}
            className="w-full flex items-center gap-3 p-4 rounded-xl border transition-colors text-left group"
            style={{ borderColor: `${themeColour}33`, backgroundColor: `${themeColour}08` }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = `${themeColour}14`; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = `${themeColour}08`; }}
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${themeColour}22` }}
            >
              <PlusCircle size={17} style={{ color: themeColour }} strokeWidth={2} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Add Holding</p>
              <p className="text-xs text-gray-400">Manually enter a ticker and quantity</p>
            </div>
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
