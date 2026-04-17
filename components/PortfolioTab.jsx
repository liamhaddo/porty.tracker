'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { ChevronDown, Plus } from 'lucide-react';
import SummaryBar from './SummaryBar';
import HoldingsList from './HoldingsList';
import AddHoldingModal from './AddHoldingModal';
import ImportCsvModal from './ImportCsvModal';
import AddMenu from './AddMenu';
import { buildChartData, applySplitsToTransactions } from '../lib/chartCalc';
import { savePortfolio } from '../lib/storage';
import { useTickerColours } from '../lib/useTickerColours';

const PieChartSection = dynamic(() => import('./PieChartSection'), { ssr: false });
const LineGraph       = dynamic(() => import('./LineGraph'),       { ssr: false });

const REFRESH_MS = 60_000;
const ACCENT = '#2E6F40';

export default function PortfolioTab({
  portfolios,
  activePortfolio,
  onSelectPortfolio,
  onCreate,
  onEdit,
  onDelete,
  onUpdate,
  currency,
}) {
  // ── Portfolio selector state ─────────────────────────────────────────────────
  const [dropdownOpen,      setDropdownOpen]      = useState(false);
  const [menuOpenId,        setMenuOpenId]        = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
        setMenuOpenId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  // ── Portfolio content state ──────────────────────────────────────────────────
  const [prices,        setPrices]        = useState({});
  const [chartData,     setChartData]     = useState([]);
  const [loadingPrices, setLoadingPrices] = useState(true);
  const [lastUpdated,   setLastUpdated]   = useState(null);
  const [showAddMenu,   setShowAddMenu]   = useState(false);
  const [showAdd,       setShowAdd]       = useState(false);
  const [showImport,    setShowImport]    = useState(false);
  const [fxRates,       setFxRates]       = useState({ USD: 1, NZD: 1.65, AUD: 1.55 });

  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    fetch('/api/fx').then(r => r.json()).then(d => { if (d.rates) setFxRates(d.rates); }).catch(() => {});
  }, []);

  const calcChart = useCallback((transactions, pricesMap) => {
    const adjusted = applySplitsToTransactions(transactions ?? []);
    setChartData(buildChartData(adjusted, pricesMap));
  }, []);

  const fetchPrices = useCallback(async (holdings) => {
    if (!holdings?.length) { setLoadingPrices(false); return {}; }
    setLoadingPrices(true);
    try {
      const res = await fetch('/api/prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickers: holdings.map(h => h.ticker) }),
      });
      const data = await res.json();
      const p = data.prices || {};
      setPrices(p);
      setLastUpdated(Date.now());
      return p;
    } catch { return {}; }
    finally { setLoadingPrices(false); }
  }, []);

  // Load on mount or portfolio switch
  const portfolioIdRef = useRef(null);
  useEffect(() => {
    if (!activePortfolio) return;
    if (portfolioIdRef.current === activePortfolio.id) return;
    portfolioIdRef.current = activePortfolio.id;
    (async () => {
      const p = await fetchPrices(activePortfolio.holdings);
      calcChart(activePortfolio.transactions, p);
    })();
  }, [activePortfolio?.id, activePortfolio?.holdings, activePortfolio?.transactions, fetchPrices, calcChart]);

  // Auto-refresh
  const portfolioRef = useRef(activePortfolio);
  useEffect(() => { portfolioRef.current = activePortfolio; }, [activePortfolio]);
  useEffect(() => {
    const id = setInterval(async () => {
      if (!portfolioRef.current) return;
      const p = await fetchPrices(portfolioRef.current.holdings);
      calcChart(portfolioRef.current.transactions, p);
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [fetchPrices, calcChart]);

  function persist(updated) {
    savePortfolio(updated);
    onUpdate(updated);
  }

  function handleAddHolding(ticker, shares) {
    if (!activePortfolio) return;
    const existing = activePortfolio.holdings.find(h => h.ticker === ticker);
    const newHoldings = existing
      ? activePortfolio.holdings.map(h => h.ticker === ticker ? { ...h, shares } : h)
      : [...activePortfolio.holdings, { ticker, shares }];
    const updated = { ...activePortfolio, holdings: newHoldings, updatedAt: new Date().toISOString() };
    persist(updated);
    fetchPrices(newHoldings).then(p => calcChart(updated.transactions, p));
  }

  function handleImport(holdings, transactions) {
    if (!activePortfolio) return;
    const updated = { ...activePortfolio, holdings, transactions, updatedAt: new Date().toISOString() };
    persist(updated);
    fetchPrices(holdings).then(p => calcChart(transactions, p));
  }

  const fxRate = fxRates[currency] ?? 1;
  const themeColour = activePortfolio?.themeColour || ACCENT;
  const tickers = useMemo(() => activePortfolio?.holdings.map(h => h.ticker) ?? [], [activePortfolio?.holdings]);
  const tickerColours = useTickerColours(tickers, themeColour);
  const totalValue = (activePortfolio?.holdings ?? []).reduce((s, h) => {
    const p = prices[h.ticker];
    return s + (p != null ? h.shares * p : 0);
  }, 0);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="bg-gray-50">
      <main className="max-w-3xl mx-auto px-4 py-5 space-y-4 pb-32 sm:pb-6">

        {/* ── Portfolio selector card ── */}
        <div className="bg-white rounded-2xl shadow-sm px-4 py-3 relative" ref={dropdownRef}>
          {/* Header row: dot + name + chevron */}
          <div className="flex items-center gap-2">
            {activePortfolio && (
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: activePortfolio.themeColour }}
              />
            )}
            <button
              onClick={() => setDropdownOpen(v => !v)}
              className="flex items-center gap-1.5 flex-1 min-w-0"
            >
              <span className="text-base font-semibold text-gray-900 truncate">
                {activePortfolio ? activePortfolio.name : 'No portfolio'}
              </span>
              <ChevronDown
                size={14}
                className={`text-gray-400 shrink-0 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>
          </div>

          {/* Dropdown */}
          {dropdownOpen && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-2xl shadow-lg z-40 border border-gray-100">
              {portfolios.map(p => (
                <PortfolioDropdownRow
                  key={p.id}
                  portfolio={p}
                  isActive={p.id === activePortfolio?.id}
                  menuOpenId={menuOpenId}
                  setMenuOpenId={setMenuOpenId}
                  onSelect={() => {
                    onSelectPortfolio(p);
                    portfolioIdRef.current = null;
                    setDropdownOpen(false);
                    setMenuOpenId(null);
                  }}
                  onEdit={() => { setDropdownOpen(false); setMenuOpenId(null); onEdit(p); }}
                  onDelete={() => { setMenuOpenId(null); setShowDeleteConfirm(p); }}
                />
              ))}

              {/* + Add Portfolio row */}
              <button
                onClick={() => { setDropdownOpen(false); onCreate(); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors border-t border-gray-100"
              >
                <Plus size={14} className="shrink-0" />
                Add Portfolio
              </button>
            </div>
          )}
        </div>

        {/* ── Portfolio content ── */}
        {!activePortfolio ? (
          <div className="flex flex-col items-center justify-center pt-16 gap-4">
            <p className="text-sm text-gray-400">No portfolios yet</p>
            <button
              onClick={onCreate}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: ACCENT }}
            >
              Create Portfolio
            </button>
          </div>
        ) : (
          <>
            <SummaryBar
              totalValue={totalValue}
              lastUpdated={lastUpdated}
              loading={loadingPrices}
              currency={currency}
              fxRate={fxRate}
            />
            <PieChartSection
              holdings={activePortfolio.holdings}
              prices={prices}
              loading={loadingPrices}
              currency={currency}
              fxRate={fxRate}
              themeColour={themeColour}
              tickerColours={tickerColours}
            />
            <LineGraph
              chartData={chartData}
              loading={loadingPrices}
              currency={currency}
              fxRate={fxRate}
              themeColour={themeColour}
            />
            <HoldingsList
              holdings={activePortfolio.holdings}
              prices={prices}
              loading={loadingPrices}
              currency={currency}
              fxRate={fxRate}
              themeColour={themeColour}
            />
          </>
        )}
      </main>

      {/* ── Modals ── */}
      {showAddMenu && (
        <AddMenu
          onClose={() => setShowAddMenu(false)}
          onImportCsv={() => setShowImport(true)}
          onAddHolding={() => setShowAdd(true)}
          themeColour={themeColour}
        />
      )}
      {showAdd && (
        <AddHoldingModal
          onClose={() => setShowAdd(false)}
          onSave={handleAddHolding}
          themeColour={themeColour}
        />
      )}
      {showImport && (
        <ImportCsvModal
          onClose={() => setShowImport(false)}
          onImport={handleImport}
          existingTransactions={activePortfolio?.transactions ?? []}
          themeColour={themeColour}
        />
      )}

      {/* ── Delete confirmation modal ── */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4"
          onClick={() => setShowDeleteConfirm(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-gray-900 mb-1">Delete portfolio?</h3>
            <p className="text-sm text-gray-500 mb-5">
              "{showDeleteConfirm.name}" will be permanently deleted. This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDelete(showDeleteConfirm.id);
                  setShowDeleteConfirm(null);
                  setDropdownOpen(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Dropdown row ──────────────────────────────────────────────────────────────

function PortfolioDropdownRow({ portfolio, isActive, menuOpenId, setMenuOpenId, onSelect, onEdit, onDelete }) {
  const menuRef = useRef(null);
  const menuOpen = menuOpenId === portfolio.id;

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpenId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen, setMenuOpenId]);

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${isActive ? 'bg-gray-50' : ''}`}
      onClick={onSelect}
    >
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: portfolio.themeColour }}
      />
      <span className="flex-1 text-sm font-medium text-gray-800 truncate">{portfolio.name}</span>

      {/* Three-dot menu */}
      <div className="relative shrink-0" ref={menuRef}>
        <button
          onClick={e => { e.stopPropagation(); setMenuOpenId(menuOpen ? null : portfolio.id); }}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label="Portfolio options"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="8" cy="2.5" r="1.5" />
            <circle cx="8" cy="8" r="1.5" />
            <circle cx="8" cy="13.5" r="1.5" />
          </svg>
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-gray-100 rounded-xl shadow-lg z-50 py-1">
            <button
              onClick={e => { e.stopPropagation(); onEdit(); }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={e => { e.stopPropagation(); onDelete(); }}
              className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
