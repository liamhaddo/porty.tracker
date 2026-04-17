'use client';

import { useState, useRef } from 'react';
import { parseCSVToTransactions, applySplitsToTransactions, calcNetHoldings } from '../lib/chartCalc';

export default function ImportCsvModal({ onClose, onImport, existingTransactions = [], themeColour = '#6366f1' }) {
  const [step,    setStep]    = useState('pick'); // 'pick' | 'confirm' | 'importing'
  const [mode,    setMode]    = useState('replace');
  const [parsed,  setParsed]  = useState(null); // { holdings, transactions, fileName }
  const [error,   setError]   = useState('');

  const fileRef = useRef(null);

  async function handleFile(file) {
    if (!file) return;
    setError('');
    try {
      const text = await file.text();
      console.log('[CSV] raw first 200 chars:', text.slice(0, 200));
      const rawTxs = parseCSVToTransactions(text);
      if (rawTxs.length === 0) throw new Error('No valid transactions found.');
      setParsed({ rawTxs, fileName: file.name });
      setStep('confirm');
    } catch (err) {
      setError(err.message);
    }
  }

  function handleImport() {
    if (!parsed) return;
    setStep('importing');

    let finalTxs;
    if (mode === 'replace') {
      finalTxs = parsed.rawTxs;
    } else {
      // Merge: deduplicate by (ticker+date+qty+type) isn't reliable — use index position
      // Simple approach: combine and let calcNetHoldings handle net positions
      finalTxs = [...existingTransactions, ...parsed.rawTxs]
        .sort((a, b) => a.date.localeCompare(b.date));
    }

    const adjusted = applySplitsToTransactions(finalTxs);
    const holdings = calcNetHoldings(adjusted);
    console.log('[CSV] transactions parsed:', finalTxs.length, 'holdings calculated:', holdings.length);
    onImport(holdings, finalTxs);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Import Transactions CSV</h2>

        {step === 'pick' && (
          <>
            <p className="text-sm text-gray-500 mb-4">
              Select the CSV exported from your broker. Holdings are recalculated automatically.
            </p>
            <input type="file" accept=".csv" ref={fileRef} onChange={e => handleFile(e.target.files?.[0])} className="hidden" />
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full py-3 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-500 hover:border-gray-300 hover:text-gray-600 transition-colors"
            >
              Choose CSV file
            </button>
            {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
            <button onClick={onClose} className="w-full mt-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </>
        )}

        {step === 'confirm' && (
          <>
            <p className="text-sm text-gray-500 mb-1">
              <span className="font-medium text-gray-700">{parsed?.fileName}</span>
            </p>
            <p className="text-xs text-gray-400 mb-4">{parsed?.rawTxs?.length} transactions found.</p>

            <div className="space-y-2 mb-4">
              {[
                { value: 'replace', label: 'Replace', desc: 'Wipe current history and recalculate from this file only.' },
                { value: 'merge',   label: 'Merge',   desc: 'Combine new transactions with existing ones and recalculate.' },
              ].map(opt => (
                <label
                  key={opt.value}
                  className={`flex gap-3 items-start p-3 rounded-xl border cursor-pointer transition-colors ${mode === opt.value ? 'border-gray-300 bg-gray-50' : 'border-gray-200 hover:bg-gray-50'}`}
                  style={mode === opt.value ? { borderColor: themeColour, backgroundColor: `${themeColour}0d` } : {}}
                >
                  <input type="radio" name="mode" value={opt.value} checked={mode === opt.value} onChange={() => setMode(opt.value)} className="mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{opt.label}</p>
                    <p className="text-xs text-gray-500">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>

            {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2 mb-3">{error}</p>}

            <div className="flex gap-2">
              <button onClick={() => setStep('pick')} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                Back
              </button>
              <button
                onClick={handleImport}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-medium transition-colors"
                style={{ backgroundColor: themeColour }}
              >
                Import
              </button>
            </div>
          </>
        )}

        {step === 'importing' && (
          <div className="py-6 text-center">
            <div className="inline-block w-6 h-6 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin mb-3" />
            <p className="text-sm text-gray-500">Processing transactions…</p>
          </div>
        )}
      </div>
    </div>
  );
}
