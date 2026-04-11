'use client';

import { useState, useRef } from 'react';

export default function ImportCsvModal({ onClose, onImported }) {
  const [file, setFile] = useState(null);
  const [step, setStep] = useState('pick'); // 'pick' | 'confirm' | 'importing'
  const [mode, setMode] = useState('replace');
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  function handleFileChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.endsWith('.csv')) {
      setError('Please select a .csv file.');
      return;
    }
    setError('');
    setFile(f);
    setStep('confirm');
  }

  async function handleImport() {
    if (!file) return;
    setStep('importing');
    setError('');

    try {
      const text = await file.text();
      const res = await fetch('/api/import-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvText: text, mode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      onImported(data.holdings);
      onClose();
    } catch (err) {
      setError(err.message);
      setStep('confirm');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Import Transactions CSV</h2>

        {step === 'pick' && (
          <>
            <p className="text-sm text-gray-500 mb-4">
              Select the CSV exported from your broker. Holdings will be recalculated automatically.
            </p>
            <input
              type="file"
              accept=".csv"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-500 hover:border-indigo-300 hover:text-indigo-500 transition-colors"
            >
              Choose CSV file
            </button>
            {error && (
              <p className="text-xs text-red-500 mt-2">{error}</p>
            )}
            <button
              onClick={onClose}
              className="w-full mt-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </>
        )}

        {step === 'confirm' && (
          <>
            <p className="text-sm text-gray-500 mb-4">
              <span className="font-medium text-gray-700">{file?.name}</span> selected. Choose how to import:
            </p>

            <div className="space-y-2 mb-4">
              <label className={`flex gap-3 items-start p-3 rounded-xl border cursor-pointer transition-colors ${mode === 'replace' ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                <input
                  type="radio"
                  name="mode"
                  value="replace"
                  checked={mode === 'replace'}
                  onChange={() => setMode('replace')}
                  className="mt-0.5 accent-indigo-500"
                />
                <div>
                  <p className="text-sm font-medium text-gray-800">Replace</p>
                  <p className="text-xs text-gray-500">Wipe current holdings and recalculate from this CSV only.</p>
                </div>
              </label>

              <label className={`flex gap-3 items-start p-3 rounded-xl border cursor-pointer transition-colors ${mode === 'merge' ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                <input
                  type="radio"
                  name="mode"
                  value="merge"
                  checked={mode === 'merge'}
                  onChange={() => setMode('merge')}
                  className="mt-0.5 accent-indigo-500"
                />
                <div>
                  <p className="text-sm font-medium text-gray-800">Merge</p>
                  <p className="text-xs text-gray-500">Add new transactions on top of the existing ones and recalculate.</p>
                </div>
              </label>
            </div>

            {error && (
              <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2 mb-3">{error}</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => { setStep('pick'); setFile(null); }}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleImport}
                className="flex-1 py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 transition-colors"
              >
                Import
              </button>
            </div>
          </>
        )}

        {step === 'importing' && (
          <div className="py-6 text-center">
            <div className="inline-block w-6 h-6 border-2 border-indigo-300 border-t-indigo-500 rounded-full animate-spin mb-3" />
            <p className="text-sm text-gray-500">Processing transactions…</p>
          </div>
        )}
      </div>
    </div>
  );
}
