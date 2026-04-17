'use client';

import { useState, useEffect, useRef } from 'react';
import { RefreshCw, Search, X, ChevronDown, ChevronUp, Plus, AlertCircle } from 'lucide-react';
import CongressFeed from './CongressFeed';

const CACHE_KEY     = 'porty_analytics_cache';
const CACHE_TTL_MS  = 60 * 60 * 1000;
const WATCHLIST_KEY = 'porty_analytics_watchlist';

export default function AnalyticsTab({ onTabChange }) {
  const [data,          setData]          = useState(null);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState(null);
  const [watchlist,     setWatchlist]     = useState([]);
  const [expanded,      setExpanded]      = useState(null);
  const [searchQuery,   setSearchQuery]   = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching,     setSearching]     = useState(false);
  const [lastUpdated,   setLastUpdated]   = useState(null);
  const searchRef = useRef(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(WATCHLIST_KEY);
      if (saved) setWatchlist(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => { loadData(); }, []); // eslint-disable-line

  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 1) { setSearchResults([]); return; }
    const timer = setTimeout(() => doSearch(searchQuery), 380);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  async function doSearch(q) {
    setSearching(true);
    try {
      const res  = await fetch(`/api/analytics?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setSearchResults(Array.isArray(data) ? data.slice(0, 5) : []);
    } catch { setSearchResults([]); }
    setSearching(false);
  }

  async function loadData(force = false) {
    if (!force) {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data: d, timestamp: ts } = JSON.parse(cached);
          if (Date.now() - ts < CACHE_TTL_MS) {
            setData(d);
            setLastUpdated(new Date(ts));
            return;
          }
        }
      } catch {}
    }

    setLoading(true);
    setError(null);
    try {
      let wl = watchlist;
      try {
        const saved = localStorage.getItem(WATCHLIST_KEY);
        if (saved) wl = JSON.parse(saved);
      } catch {}

      const res = await fetch('/api/analytics', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ watchlist: wl }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server error ${res.status}`);
      }

      const result = await res.json();
      if (result.error) throw new Error(result.error);

      setData(result);
      const now = new Date();
      setLastUpdated(now);
      localStorage.setItem(CACHE_KEY, JSON.stringify({ data: result, timestamp: Date.now() }));
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  function addToWatchlist(ticker) {
    if (watchlist.includes(ticker)) return;
    const updated = [...watchlist, ticker.toUpperCase()];
    setWatchlist(updated);
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(updated));
    setSearchQuery('');
    setSearchResults([]);
  }

  function removeFromWatchlist(ticker) {
    const updated = watchlist.filter(t => t !== ticker);
    setWatchlist(updated);
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(updated));
  }

  function scoreColour(score) {
    if (score == null) return 'text-gray-400';
    if (score >= 75)   return 'text-emerald-600';
    if (score >= 60)   return 'text-amber-500';
    return 'text-red-500';
  }

  function signalTextColour(val) {
    const map = {
      Strong: 'text-emerald-600', Bullish: 'text-emerald-600', Cheap: 'text-emerald-600',
      Moderate: 'text-amber-500', Neutral: 'text-gray-400',    Fair: 'text-gray-400',
      Weak: 'text-red-400',       Bearish: 'text-red-400',     Expensive: 'text-red-400',
    };
    return map[val] || 'text-gray-500';
  }

  function recTypeBg(type) {
    const map = {
      'High Conviction': 'bg-indigo-50 text-indigo-600',
      'New Entry':       'bg-emerald-50 text-emerald-700',
      'Momentum Pickup': 'bg-blue-50 text-blue-600',
      'Re-Entry':        'bg-purple-50 text-purple-600',
    };
    return map[type] || 'bg-gray-100 text-gray-500';
  }

  function holdingSignalBg(signal) {
    const map = {
      Strong: 'bg-emerald-50 text-emerald-700',
      Hold:   'bg-gray-100 text-gray-500',
      Watch:  'bg-amber-50 text-amber-600',
      Exit:   'bg-red-50 text-red-500',
    };
    return map[signal] || 'bg-gray-100 text-gray-500';
  }

  function regimeBg(regime) {
    const map = {
      Bull:      'bg-emerald-50 text-emerald-700',
      Neutral:   'bg-gray-100 text-gray-600',
      Defensive: 'bg-red-50 text-red-600',
    };
    return map[regime] || 'bg-gray-100 text-gray-600';
  }

  function formatTimestamp(date) {
    if (!date) return '';
    const diff = Math.floor((Date.now() - date.getTime()) / 60000);
    if (diff < 1)   return 'just now';
    if (diff === 1) return '1 min ago';
    if (diff < 60)  return `${diff} mins ago`;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function SectionHeader({ emoji, title, sub }) {
    return (
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50/70 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-500 tracking-wide uppercase">{emoji} {title}</p>
        {sub && <span className="text-[11px] text-gray-400">{sub}</span>}
      </div>
    );
  }

  function FactorBars({ scores }) {
    if (!scores) return null;
    const labels = { momentum: 'Momentum', accumulation: 'Accum.', quality: 'Quality', value: 'Value' };
    return (
      <div className="space-y-1.5 mb-3">
        {Object.entries(scores).map(([key, val]) => (
          <div key={key} className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400 w-20 shrink-0">{labels[key] || key}</span>
            <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{
                width: `${Math.max(0, Math.min(100, val))}%`,
                backgroundColor: val >= 70 ? '#10b981' : val >= 50 ? '#f59e0b' : '#ef4444',
              }} />
            </div>
            <span className="text-[10px] font-medium text-gray-500 w-5 text-right">{val}</span>
          </div>
        ))}
      </div>
    );
  }

  function SignalRow({ signals }) {
    if (!signals) return null;
    return (
      <div className="flex gap-3 p-2.5 bg-white rounded-xl mb-3 border border-gray-100">
        {Object.entries(signals).map(([key, val]) => (
          <div key={key} className="flex-1 flex flex-col items-center">
            <span className="text-[9px] text-gray-400 mb-0.5 uppercase tracking-wide leading-tight text-center">
              {key.replace('_', ' ')}
            </span>
            <span className={`text-[11px] font-semibold ${signalTextColour(val)}`}>{val || '—'}</span>
          </div>
        ))}
      </div>
    );
  }

  function RecRow({ rec, isExpanded, onToggle, isWatchlist = false }) {
    const price  = rec.price    != null ? `$${rec.price.toFixed(2)}` : '—';
    const chg    = rec.change1d != null ? rec.change1d : null;
    const chgFmt = chg != null ? `${chg >= 0 ? '+' : ''}${chg.toFixed(2)}%` : null;
    const chgCol = chg == null ? 'text-gray-400' : chg >= 0 ? 'text-emerald-600' : 'text-red-500';

    return (
      <div className="border-b border-gray-50 last:border-0">
        <button onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-gray-50 transition-colors text-left">
          {!isWatchlist && rec.rank != null && (
            <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-400 shrink-0">
              {rec.rank}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-bold text-gray-900">{rec.ticker}</span>
              {rec.recommendation_type && (
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md leading-none ${recTypeBg(rec.recommendation_type)}`}>
                  {rec.recommendation_type}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {price}{chgFmt && <span className={`ml-1.5 ${chgCol}`}>{chgFmt}</span>}
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="text-right">
              <p className={`text-base font-bold leading-none ${scoreColour(rec.final_score)}`}>{rec.final_score ?? '—'}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{rec.confidence}</p>
            </div>
            {isExpanded ? <ChevronUp size={14} className="text-gray-300" /> : <ChevronDown size={14} className="text-gray-300" />}
          </div>
        </button>

        {isExpanded && (
          <div className="px-4 pb-4 pt-1 bg-gray-50/40">
            <FactorBars scores={rec.factor_scores} />
            <SignalRow signals={rec.signals} />
            {rec.ai_summary && <p className="text-xs text-gray-600 leading-relaxed mb-2.5">{rec.ai_summary}</p>}
            {Array.isArray(rec.key_drivers) && rec.key_drivers.length > 0 && (
              <div className="space-y-1">
                {rec.key_drivers.map((d, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <span className="text-indigo-400 text-xs shrink-0">›</span>
                    <p className="text-xs text-gray-500 leading-snug">{d}</p>
                  </div>
                ))}
              </div>
            )}
            {isWatchlist && (
              <button onClick={() => removeFromWatchlist(rec.ticker)} className="mt-3 flex items-center gap-1 text-xs text-red-400 active:opacity-70">
                <X size={11} /> Remove from watchlist
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  function HoldingRowFull({ h }) {
    const price  = h.price    != null ? `$${h.price.toFixed(2)}` : '—';
    const chg    = h.change1d != null ? h.change1d : null;
    const chgFmt = chg != null ? `${chg >= 0 ? '+' : ''}${chg.toFixed(2)}%` : null;
    const chgCol = chg == null ? 'text-gray-400' : chg >= 0 ? 'text-emerald-600' : 'text-red-500';
    return (
      <div className="border-b border-gray-50 last:border-0">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-[11px] font-bold text-gray-500 shrink-0">
              {h.ticker.slice(0, 2)}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 leading-none">{h.ticker}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {price}{chgFmt && <span className={`ml-1 ${chgCol}`}>{chgFmt}</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {h.signal && (
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${holdingSignalBg(h.signal)}`}>{h.signal}</span>
            )}
            <span className={`text-sm font-bold ${scoreColour(h.final_score)}`}>{h.final_score ?? '—'}</span>
          </div>
        </div>
        {h.one_liner && <p className="text-xs text-gray-400 px-4 pb-2.5 -mt-1 leading-snug">{h.one_liner}</p>}
      </div>
    );
  }

  const THEME = '#6366f1';

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <div className="bg-white px-4 pt-4 pb-3 border-b border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-none">Analytics</h1>
            {lastUpdated && <p className="text-xs text-gray-400 mt-0.5">Updated {formatTimestamp(lastUpdated)}</p>}
          </div>
          <button
            onClick={() => loadData(true)}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full active:opacity-70 disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>

        {data?.market_regime && (
          <div className="mb-3">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${regimeBg(data.market_regime)}`}>
              {data.market_regime} Market
            </span>
          </div>
        )}

        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Add stocks to watchlist…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-8 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-300 focus:bg-white transition-colors"
          />
          {searchQuery && !searching && (
            <button onClick={() => { setSearchQuery(''); setSearchResults([]); }} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X size={13} className="text-gray-400" />
            </button>
          )}
          {searching && <RefreshCw size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />}
        </div>

        {searchResults.length > 0 && (
          <div className="mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden relative z-10">
            {searchResults.map(r => {
              const already = watchlist.includes(r.symbol);
              return (
                <button key={r.symbol} onClick={() => !already && addToWatchlist(r.symbol)}
                  className="w-full flex items-center justify-between px-4 py-2.5 border-b border-gray-50 last:border-0 active:bg-gray-50 transition-colors">
                  <div className="text-left">
                    <p className="text-sm font-bold text-gray-900">{r.symbol}</p>
                    <p className="text-xs text-gray-400 truncate max-w-[220px]">{r.name}</p>
                  </div>
                  <div className={`flex items-center gap-1 text-xs font-medium ${already ? 'text-gray-400' : 'text-indigo-600'}`}>
                    {already ? '✓ Added' : <><Plus size={11} /> Add</>}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pb-32 sm:pb-6">
        {error && (
          <div className="mx-3 mt-4 flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-2xl">
            <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-red-600">Failed to load analytics</p>
              <p className="text-xs text-red-400 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {loading && !data && (
          <div className="flex flex-col items-center justify-center pt-24 gap-3">
            <RefreshCw size={22} className="text-indigo-400 animate-spin" />
            <p className="text-sm text-gray-400">Analysing market data…</p>
            <p className="text-xs text-gray-300">This takes 10–20 seconds</p>
          </div>
        )}

        {!loading && !data && !error && (
          <div className="flex flex-col items-center justify-center pt-24 gap-2">
            <p className="text-sm text-gray-400">Tap Refresh to load market analysis</p>
          </div>
        )}

        {data && (
          <>
            {data.recommendations?.length > 0 && (
              <div className="bg-white mt-3 mx-3 rounded-2xl shadow-sm overflow-hidden">
                <SectionHeader emoji="🔥" title="Top Picks" sub={`${data.recommendations.length} swing trade ideas`} />
                {data.recommendations.map(rec => (
                  <RecRow key={rec.ticker} rec={rec}
                    isExpanded={expanded === rec.ticker}
                    onToggle={() => setExpanded(expanded === rec.ticker ? null : rec.ticker)} />
                ))}
              </div>
            )}

            {watchlist.length > 0 && (
              <div className="bg-white mt-3 mx-3 rounded-2xl shadow-sm overflow-hidden">
                <SectionHeader emoji="👁" title="Watchlist" sub={`${watchlist.length} stocks`} />
                {watchlist.map(ticker => {
                  const scored = data.watchlistScored?.find(w => w.ticker === ticker);
                  if (!scored) {
                    return (
                      <div key={ticker} className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0">
                        <p className="text-sm font-semibold text-gray-900">{ticker}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-gray-400">Refresh to score</p>
                          <button onClick={() => removeFromWatchlist(ticker)} className="text-gray-300 active:text-red-400">
                            <X size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <RecRow key={ticker} rec={scored} isWatchlist
                      isExpanded={expanded === ticker}
                      onToggle={() => setExpanded(expanded === ticker ? null : ticker)} />
                  );
                })}
              </div>
            )}

            {watchlist.length === 0 && (
              <div className="mx-3 mt-3 bg-white rounded-2xl shadow-sm overflow-hidden">
                <SectionHeader emoji="👁" title="Watchlist" />
                <div className="px-4 py-5 text-center">
                  <p className="text-xs text-gray-400">Search for a ticker above to start tracking it</p>
                </div>
              </div>
            )}

            {data.watchlist_alerts?.length > 0 && (
              <div className="mx-3 mt-3 space-y-2">
                {data.watchlist_alerts.map(a => (
                  <div key={a.ticker} className="bg-amber-50 border border-amber-100 rounded-xl px-3.5 py-2.5 flex items-start gap-2">
                    <span className="text-amber-500 text-xs shrink-0 mt-0.5">⚡</span>
                    <div>
                      <span className="text-xs font-semibold text-amber-700">{a.ticker}</span>
                      <span className="text-xs text-amber-600"> — {a.reason}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {data.holdingsScored?.length > 0 && (
              <div className="bg-white mt-3 mx-3 rounded-2xl shadow-sm overflow-hidden">
                <SectionHeader emoji="💼" title="Your Holdings" sub={`${data.holdingsScored.length} stocks`} />
                {data.holdingsScored.map(h => <HoldingRowFull key={h.ticker} h={h} />)}
              </div>
            )}

            {/* Congress Trades */}
            <div className="bg-white mt-3 mx-3 rounded-2xl shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50/70 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-500 tracking-wide uppercase">🏛 Congress Trades</p>
              </div>
              <CongressFeed themeColour="#2E6F40" />
            </div>

            <p className="text-center text-[10px] text-gray-300 mt-4 mb-2 px-6 leading-relaxed">
              Scores are AI-generated for informational purposes only. Not financial advice. Always do your own research.
            </p>
          </>
        )}
      </div>

    </div>
  );
}
