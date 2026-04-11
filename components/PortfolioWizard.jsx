'use client';

import { useState, useRef } from 'react';
import Logo from './Logo';
import { parseCSVToTransactions, applySplitsToTransactions, calcNetHoldings } from '../lib/chartCalc';
import { savePortfolio, newPortfolioId, deletePortfolio } from '../lib/storage';

function ChevronLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}

const THEME_COLOURS = [
  { name: 'Indigo',      value: '#6366f1' },
  { name: 'Emerald',     value: '#10b981' },
  { name: 'Sky',         value: '#0ea5e9' },
  { name: 'Violet',      value: '#8b5cf6' },
  { name: 'Amber',       value: '#f59e0b' },
  { name: 'Rose',        value: '#f43f5e' },
  { name: 'Teal',        value: '#14b8a6' },
  { name: 'Terracotta',  value: '#ea580c' },
];

export default function PortfolioWizard({ mode = 'create', portfolio = null, onComplete, onCancel }) {
  const isEdit = mode === 'edit';

  const [step, setStep] = useState(1);
  const [name, setName] = useState(portfolio?.name ?? '');
  const [themeColour, setThemeColour] = useState(portfolio?.themeColour ?? THEME_COLOURS[0].value);
  const [csvResult, setCsvResult] = useState(null); // { holdings, transactions }
  const [csvSkipped, setCsvSkipped] = useState(false);
  const [csvError, setCsvError] = useState('');
  const [parsing, setParsing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const fileRef = useRef(null);

  // ── Step 1: Name ──────────────────────────────────────────────────────────

  function Step1() {
    return (
      <div className="space-y-6">
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-2">
            Portfolio Name
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && name.trim() && setStep(2)}
            placeholder="e.g. Investments, Retirement, Speculative"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            autoFocus
          />
        </div>
        <div className="flex gap-2 pt-1">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => setStep(2)}
            disabled={!name.trim()}
            className="flex-1 py-2.5 rounded-xl text-white text-sm font-medium transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
            style={{ backgroundColor: themeColour }}
          >
            Next <ChevronRight />
          </button>
        </div>
      </div>
    );
  }

  // ── Step 2: Colour ────────────────────────────────────────────────────────

  function Step2() {
    return (
      <div className="space-y-6">
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-3">
            Choose a Theme Colour
          </label>
          <div className="grid grid-cols-4 gap-3">
            {THEME_COLOURS.map(c => (
              <button
                key={c.value}
                onClick={() => setThemeColour(c.value)}
                title={c.name}
                className="aspect-square rounded-xl transition-transform hover:scale-105 flex items-center justify-center"
                style={{ backgroundColor: c.value }}
              >
                {themeColour === c.value && (
                  <svg className="w-5 h-5 text-white drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => setStep(1)}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5"
          >
            <ChevronLeft /> Back
          </button>
          <button
            onClick={() => setStep(3)}
            className="flex-1 py-2.5 rounded-xl text-white text-sm font-medium transition-colors flex items-center justify-center gap-1.5"
            style={{ backgroundColor: themeColour }}
          >
            Next <ChevronRight />
          </button>
        </div>
      </div>
    );
  }

  // ── Step 3: CSV ───────────────────────────────────────────────────────────

  async function handleFile(file) {
    if (!file) return;
    setCsvError('');
    setParsing(true);
    try {
      const text = await file.text();
      const raw = parseCSVToTransactions(text);
      if (raw.length === 0) throw new Error('No valid transactions found in this file.');
      const adjusted = applySplitsToTransactions(raw);
      const holdings = calcNetHoldings(adjusted);
      setCsvResult({ holdings, transactions: raw }); // store pre-split for re-calculation
      setCsvSkipped(false);
    } catch (err) {
      setCsvError(err.message);
    } finally {
      setParsing(false);
    }
  }

  function handleSkip() {
    setCsvResult(null);
    setCsvSkipped(true);
  }

  function handleFinish() {
    const now = new Date().toISOString();
    let transactions, holdings;

    if (csvSkipped && isEdit) {
      // Keep existing data
      transactions = portfolio.transactions ?? [];
      holdings = portfolio.holdings ?? [];
    } else {
      transactions = csvResult?.transactions ?? [];
      holdings = csvResult?.holdings ?? [];
    }

    const updated = {
      id: portfolio?.id ?? newPortfolioId(),
      name: name.trim(),
      themeColour,
      holdings,
      transactions,
      createdAt: portfolio?.createdAt ?? now,
      updatedAt: now,
    };

    savePortfolio(updated);
    onComplete(updated);
  }

  function handleDelete() {
    deletePortfolio(portfolio.id);
    onCancel();
  }

  function Step3() {
    const canFinish = csvResult !== null || (isEdit && csvSkipped);

    return (
      <div className="space-y-5">
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
            {isEdit ? 'Update Transaction History' : 'Import Transactions'}
          </label>
          <p className="text-xs text-gray-400 mb-3">
            {isEdit
              ? 'Upload a new CSV to replace your current transaction history, or skip to keep it.'
              : 'Select the CSV exported from your broker. Holdings are calculated automatically.'}
          </p>

          <input type="file" accept=".csv" ref={fileRef} onChange={e => handleFile(e.target.files?.[0])} className="hidden" />

          {csvResult ? (
            <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm">
              <p className="font-medium text-gray-800 mb-0.5">
                {csvResult.transactions.length} transactions parsed
              </p>
              <p className="text-gray-500 text-xs">
                {csvResult.holdings.length} positions: {csvResult.holdings.map(h => h.ticker).join(', ')}
              </p>
              <button
                onClick={() => { setCsvResult(null); setCsvSkipped(false); }}
                className="text-xs text-gray-400 hover:text-gray-600 mt-1 underline"
              >
                Choose a different file
              </button>
            </div>
          ) : csvSkipped ? (
            <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-500 flex items-center justify-between">
              <span>Keeping existing transaction history.</span>
              <button onClick={() => setCsvSkipped(false)} className="text-xs underline text-gray-400 hover:text-gray-600">Undo</button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={parsing}
              className="w-full py-8 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-400 hover:border-gray-300 hover:text-gray-600 transition-colors"
            >
              {parsing ? 'Parsing…' : 'Choose CSV file'}
            </button>
          )}

          {csvError && (
            <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2 mt-2">{csvError}</p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setStep(2)}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5"
          >
            <ChevronLeft /> Back
          </button>
          {isEdit && !csvResult && !csvSkipped && (
            <button
              onClick={handleSkip}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Skip
            </button>
          )}
          <button
            onClick={handleFinish}
            disabled={!canFinish}
            className="flex-1 py-2.5 rounded-xl text-white text-sm font-medium transition-colors disabled:opacity-40"
            style={{ backgroundColor: themeColour }}
          >
            {isEdit ? 'Save Changes' : 'Create Portfolio'}
          </button>
        </div>

        {/* Delete (edit mode only) */}
        {isEdit && (
          <div className="pt-2 border-t border-gray-100">
            {showDeleteConfirm ? (
              <div className="bg-red-50 rounded-xl p-3 space-y-2">
                <p className="text-xs text-red-700 font-medium">Delete "{portfolio.name}"? This cannot be undone.</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-2 rounded-lg border border-gray-200 text-xs text-gray-600 bg-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex-1 py-2 rounded-lg bg-red-500 text-white text-xs font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full text-xs text-gray-400 hover:text-red-500 transition-colors py-1"
              >
                Delete Portfolio
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  const stepTitle = {
    1: isEdit ? 'Edit Portfolio' : 'New Portfolio',
    2: 'Choose a Colour',
    3: isEdit ? 'Edit Portfolio' : 'New Portfolio',
  }[step];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center px-4 py-16">
      <div className="mb-10 text-center">
        <Logo />
      </div>

      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-6">
        {/* Step indicator */}
        <div className="flex items-center gap-1.5 mb-5">
          {[1, 2, 3].map(s => (
            <div
              key={s}
              className="h-1 flex-1 rounded-full transition-colors"
              style={{ backgroundColor: s <= step ? themeColour : '#e5e7eb' }}
            />
          ))}
        </div>

        <h2 className="text-base font-semibold text-gray-900 mb-4">{stepTitle}</h2>

        {step === 1 && <Step1 />}
        {step === 2 && <Step2 />}
        {step === 3 && <Step3 />}
      </div>
    </div>
  );
}
