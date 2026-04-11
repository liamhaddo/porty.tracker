'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import SummaryBar from '../components/SummaryBar';
import HoldingsList from '../components/HoldingsList';
import AddHoldingModal from '../components/AddHoldingModal';
import ImportCsvModal from '../components/ImportCsvModal';

const PieChartSection = dynamic(() => import('../components/PieChartSection'), { ssr: false });
const LineGraph = dynamic(() => import('../components/LineGraph'), { ssr: false });

const REFRESH_INTERVAL_MS = 60_000;
const CURRENCIES = ['USD', 'NZD', 'AUD'];

export default function Home() {
  const [holdings, setHoldings] = useState([]);
  const [prices, setPrices] = useState({});
  const [chartData, setChartData] = useState([]);
  const [loadingPrices, setLoadingPrices] = useState(true);
  const [loadingChart, setLoadingChart] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [currency, setCurrency] = useState('USD');
  const [fxRates, setFxRates] = useState({ USD: 1, NZD: 1.65, AUD: 1.55 });

  // Re-render the "X seconds ago" label every 5 s
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(id);
  }, []);

  // Fetch live exchange rates once on mount
  useEffect(() => {
    fetch('/api/fx')
      .then((r) => r.json())
      .then((d) => { if (d.rates) setFxRates(d.rates); })
      .catch(() => {});
  }, []);

  const fetchHoldings = useCallback(async () => {
    try {
      const res = await fetch('/api/holdings');
      const data = await res.json();
      if (data.holdings) setHoldings(data.holdings);
      return data.holdings || [];
    } catch {
      return [];
    }
  }, []);

  const fetchPrices = useCallback(async (holdingsList) => {
    if (!holdingsList || holdingsList.length === 0) return {};
    setLoadingPrices(true);
    try {
      const tickers = holdingsList.map((h) => h.ticker);
      const res = await fetch('/api/prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickers }),
      });
      const data = await res.json();
      const p = data.prices || {};
      setPrices(p);
      setLastUpdated(Date.now());
      return p;
    } catch {
      return {};
    } finally {
      setLoadingPrices(false);
    }
  }, []);

  const fetchChartData = useCallback(async (pricesMap) => {
    setLoadingChart(true);
    try {
      const res = await fetch('/api/chart-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prices: pricesMap }),
      });
      const data = await res.json();
      setChartData(data.snapshots || []);
    } catch {
      setChartData([]);
    } finally {
      setLoadingChart(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const h = await fetchHoldings();
      const p = await fetchPrices(h);
      await fetchChartData(p);
    })();
  }, [fetchHoldings, fetchPrices, fetchChartData]);

  const holdingsRef = useRef(holdings);
  useEffect(() => { holdingsRef.current = holdings; }, [holdings]);

  useEffect(() => {
    const id = setInterval(async () => {
      const p = await fetchPrices(holdingsRef.current);
      await fetchChartData(p);
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchPrices, fetchChartData]);

  async function handleHoldingsSaved(newHoldings) {
    if (newHoldings) setHoldings(newHoldings);
    const h = newHoldings || holdings;
    const p = await fetchPrices(h);
    await fetchChartData(p);
  }

  const fxRate = fxRates[currency] ?? 1;

  const totalValue = holdings.reduce((s, h) => {
    const p = prices[h.ticker];
    return s + (p != null ? h.shares * p : 0);
  }, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <h1
            className="text-center sm:text-left text-4xl font-bold"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            porty
          </h1>
          <div className="flex items-center gap-2">
            {/* Currency selector */}
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="text-xs font-medium text-gray-600 border border-gray-200 rounded-lg px-2 py-1.5 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer transition-colors"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <button
              onClick={() => setShowImportModal(true)}
              className="text-xs font-medium text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors"
            >
              Import CSV
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="hidden sm:flex items-center gap-1 text-xs font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg px-3 py-1.5 transition-colors"
            >
              <span className="text-base leading-none">+</span> Add Holding
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-3xl mx-auto px-4 py-5 space-y-4">
        <SummaryBar
          totalValue={totalValue}
          lastUpdated={lastUpdated}
          loading={loadingPrices}
          currency={currency}
          fxRate={fxRate}
        />

        <PieChartSection
          holdings={holdings}
          prices={prices}
          loading={loadingPrices}
          currency={currency}
          fxRate={fxRate}
        />

        <LineGraph
          chartData={chartData}
          loading={loadingChart}
          currency={currency}
          fxRate={fxRate}
        />

        <HoldingsList
          holdings={holdings}
          prices={prices}
          loading={loadingPrices}
          currency={currency}
          fxRate={fxRate}
        />
      </main>

      {/* Mobile FAB */}
      <button
        onClick={() => setShowAddModal(true)}
        className="sm:hidden fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-indigo-500 text-white shadow-lg text-2xl font-light flex items-center justify-center hover:bg-indigo-600 transition-colors"
        aria-label="Add holding"
      >
        +
      </button>

      {showAddModal && (
        <AddHoldingModal
          onClose={() => setShowAddModal(false)}
          onSaved={handleHoldingsSaved}
        />
      )}
      {showImportModal && (
        <ImportCsvModal
          onClose={() => setShowImportModal(false)}
          onImported={handleHoldingsSaved}
        />
      )}
    </div>
  );
}
