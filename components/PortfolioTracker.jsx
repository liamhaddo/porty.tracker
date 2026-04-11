'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import Logo from './Logo';
import SummaryBar from './SummaryBar';
import HoldingsList from './HoldingsList';
import AddHoldingModal from './AddHoldingModal';
import ImportCsvModal from './ImportCsvModal';
import { buildChartData, applySplitsToTransactions } from '../lib/chartCalc';
import { savePortfolio } from '../lib/storage';

const PieChartSection = dynamic(() => import('./PieChartSection'), { ssr: false });
const LineGraph       = dynamic(() => import('./LineGraph'),       { ssr: false });

const REFRESH_MS = 60_000;
const CURRENCIES = ['USD', 'NZD', 'AUD'];

export default function PortfolioTracker({ portfolio, onBack, onUpdate }) {
  const [prices,      setPrices]      = useState({});
  const [chartData,   setChartData]   = useState([]);
  const [loadingPrices, setLoadingPrices] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [showAdd,     setShowAdd]     = useState(false);
  const [showImport,  setShowImport]  = useState(false);
  const [currency,    setCurrency]    = useState('USD');
  const [fxRates,     setFxRates]     = useState({ USD: 1, NZD: 1.65, AUD: 1.55 });

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
    if (portfolioIdRef.current === portfolio.id) return;
    portfolioIdRef.current = portfolio.id;
    (async () => {
      const p = await fetchPrices(portfolio.holdings);
      calcChart(portfolio.transactions, p);
    })();
  }, [portfolio.id, portfolio.holdings, portfolio.transactions, fetchPrices, calcChart]);

  // Auto-refresh
  const portfolioRef = useRef(portfolio);
  useEffect(() => { portfolioRef.current = portfolio; }, [portfolio]);
  useEffect(() => {
    const id = setInterval(async () => {
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
    const existing = portfolio.holdings.find(h => h.ticker === ticker);
    const newHoldings = existing
      ? portfolio.holdings.map(h => h.ticker === ticker ? { ...h, shares } : h)
      : [...portfolio.holdings, { ticker, shares }];
    const updated = { ...portfolio, holdings: newHoldings, updatedAt: new Date().toISOString() };
    persist(updated);
    fetchPrices(newHoldings).then(p => calcChart(updated.transactions, p));
  }

  function handleImport(holdings, transactions) {
    const updated = { ...portfolio, holdings, transactions, updatedAt: new Date().toISOString() };
    persist(updated);
    fetchPrices(holdings).then(p => calcChart(transactions, p));
  }

  const fxRate = fxRates[currency] ?? 1;
  const themeColour = portfolio.themeColour || '#6366f1';
  const totalValue = portfolio.holdings.reduce((s, h) => {
    const p = prices[h.ticker];
    return s + (p != null ? h.shares * p : 0);
  }, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          {/* Back */}
          <button
            onClick={onBack}
            className="text-sm text-gray-400 hover:text-gray-700 transition-colors shrink-0 flex items-center gap-1"
          >
            <span className="text-base leading-none">←</span>
          </button>

          {/* Logo */}
          <div className="flex-1">
            <Logo />
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <select
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              className="text-xs font-medium text-gray-600 border border-gray-200 rounded-lg px-2 py-1.5 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer transition-colors"
            >
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <button
              onClick={() => setShowImport(true)}
              className="text-xs font-medium text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors"
            >
              Import CSV
            </button>

            <button
              onClick={() => setShowAdd(true)}
              className="hidden sm:flex items-center gap-1 text-xs font-medium text-white rounded-lg px-3 py-1.5 transition-colors"
              style={{ backgroundColor: themeColour }}
            >
              <span className="text-base leading-none">+</span> Add Holding
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-3xl mx-auto px-4 py-5 space-y-4">
        <SummaryBar
          totalValue={totalValue}
          lastUpdated={lastUpdated}
          loading={loadingPrices}
          currency={currency}
          fxRate={fxRate}
        />
        <PieChartSection
          holdings={portfolio.holdings}
          prices={prices}
          loading={loadingPrices}
          currency={currency}
          fxRate={fxRate}
          themeColour={themeColour}
        />
        <LineGraph
          chartData={chartData}
          loading={loadingPrices}
          currency={currency}
          fxRate={fxRate}
          themeColour={themeColour}
        />
        <HoldingsList
          holdings={portfolio.holdings}
          prices={prices}
          loading={loadingPrices}
          currency={currency}
          fxRate={fxRate}
        />
      </main>

      {/* Mobile FAB */}
      <button
        onClick={() => setShowAdd(true)}
        className="sm:hidden fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full text-white shadow-lg text-2xl font-light flex items-center justify-center transition-colors"
        style={{ backgroundColor: themeColour }}
        aria-label="Add holding"
      >
        +
      </button>

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
          existingTransactions={portfolio.transactions ?? []}
          themeColour={themeColour}
        />
      )}
    </div>
  );
}
