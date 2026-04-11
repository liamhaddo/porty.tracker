'use client';

import { useState } from 'react';

export default function AddHoldingModal({ onClose, onSave, themeColour = '#6366f1' }) {
  const [ticker, setTicker] = useState('');
  const [shares, setShares] = useState('');
  const [error,  setError]  = useState('');

  function handleSave(e) {
    e.preventDefault();
    setError('');
    if (!ticker.trim()) { setError('Ticker is required.'); return; }
    const qty = parseFloat(shares);
    if (isNaN(qty) || qty <= 0) { setError('Quantity must be a positive number.'); return; }
    onSave(ticker.trim().toUpperCase(), qty);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Add / Update Holding</h2>
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
              Ticker Symbol
            </label>
            <input
              type="text"
              value={ticker}
              onChange={e => setTicker(e.target.value.toUpperCase())}
              placeholder="e.g. AAPL"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 uppercase"
              style={{ '--tw-ring-color': themeColour }}
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
              Quantity (shares)
            </label>
            <input
              type="number"
              value={shares}
              onChange={e => setShares(e.target.value)}
              placeholder="e.g. 10.5"
              step="any"
              min="0"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2"
            />
          </div>
          {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-medium transition-colors"
              style={{ backgroundColor: themeColour }}
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
