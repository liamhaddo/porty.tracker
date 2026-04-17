'use client';

import { useState, useEffect } from 'react';

// ── Politician metadata (hardcoded — API doesn't return committee roles) ──────

const POLITICIAN_META = {
  pelosi:     { display: 'Nancy Pelosi',     party: 'D', role: 'Former Speaker / Minority Leader' },
  tuberville: { display: 'Tommy Tuberville', party: 'R', role: 'Senator, Armed Services Cmte.' },
  mullin:     { display: 'Markwayne Mullin', party: 'R', role: 'Senator, Armed Services Cmte.' },
  gottheimer: { display: 'Josh Gottheimer',  party: 'D', role: 'Representative, Financial Services Cmte.' },
  mccaul:     { display: 'Michael McCaul',   party: 'R', role: 'Representative, Foreign Affairs / Homeland Security' },
};

function getMeta(name) {
  if (!name) return null;
  const lower = name.toLowerCase();
  const entry = Object.entries(POLITICIAN_META).find(([key]) => lower.includes(key));
  return entry ? entry[1] : null;
}

function isBuy(type) {
  const t = (type || '').toLowerCase();
  return t.includes('purchase') || t === 'buy';
}

function formatDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return new Date(Number(y), Number(m) - 1, Number(d))
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Unique key used for both score fetching and localStorage caching
function tradeKey(trade) {
  const politician = (getMeta(trade.name)?.display || trade.name)
    .toLowerCase().replace(/\s+/g, '_');
  return `porty_trade_score_${trade.ticker}_${politician}_${trade.transactionDate}`;
}

// Badge colour by score bracket
function scoreBadgeStyle(score) {
  if (score >= 9)  return { backgroundColor: '#10b981', color: '#fff' }; // bright green
  if (score >= 7)  return { backgroundColor: '#22c55e', color: '#fff' }; // green
  if (score >= 5)  return { backgroundColor: '#f59e0b', color: '#fff' }; // amber
  return             { backgroundColor: '#ef4444', color: '#fff' };       // red
}

// ── Shared ticker logo ────────────────────────────────────────────────────────

function TickerLogo({ ticker, themeColour }) {
  const [errored, setErrored] = useState(false);
  const token = process.env.NEXT_PUBLIC_LOGO_DEV_KEY;

  if (errored || !token || !ticker) {
    return (
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
        style={{ backgroundColor: themeColour }}
      >
        {(ticker || '?').slice(0, 2)}
      </div>
    );
  }

  return (
    <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-50 shrink-0 flex items-center justify-center">
      <img
        src={`https://img.logo.dev/ticker/${ticker}?token=${token}&retina=true`}
        alt={ticker}
        width={32}
        height={32}
        className="object-contain"
        onError={() => setErrored(true)}
      />
    </div>
  );
}

// ── Score badge ───────────────────────────────────────────────────────────────

function ScoreBadge({ scoreData }) {
  // scoreData: null = loading, { score, reasoning } = loaded, { error } = failed
  if (scoreData === null) {
    return (
      <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-gray-100">
        <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-300 border-t-gray-500 animate-spin" />
      </div>
    );
  }
  if (!scoreData || scoreData.error) return null;

  return (
    <div
      className="w-9 h-9 rounded-full flex flex-col items-center justify-center shrink-0 text-center leading-none"
      style={scoreBadgeStyle(scoreData.score)}
      title={scoreData.reasoning}
    >
      <span className="text-[11px] font-bold">{scoreData.score}</span>
      <span className="text-[8px] opacity-80">/10</span>
    </div>
  );
}

// ── Individual trade row ──────────────────────────────────────────────────────

function TradeRow({ trade, themeColour, scoreData }) {
  const meta = getMeta(trade.name);
  const buy  = isBuy(trade.type);

  return (
    <div className="px-4 py-3 hover:bg-gray-50 transition-colors rounded-xl">
      <div className="flex items-center gap-3">
        <TickerLogo ticker={trade.ticker} themeColour={themeColour} />

        {/* Name + role */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            <span className="text-xs font-semibold text-gray-800 truncate">
              {meta?.display || trade.name}
            </span>
            {meta && (
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white shrink-0 leading-tight"
                style={{ backgroundColor: meta.party === 'D' ? '#3b82f6' : '#ef4444' }}
              >
                {meta.party}
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-400 truncate leading-tight">
            {meta?.role || ''}
          </p>
        </div>

        {/* Ticker + buy/sell + amount + date */}
        <div className="text-right shrink-0">
          <div className="flex items-center justify-end gap-1.5 mb-0.5">
            <span className="text-xs font-bold text-gray-800">{trade.ticker}</span>
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-tight"
              style={
                buy
                  ? { backgroundColor: '#dcfce7', color: '#16a34a' }
                  : { backgroundColor: '#fee2e2', color: '#dc2626' }
              }
            >
              {buy ? 'BUY' : 'SELL'}
            </span>
          </div>
          <p className="text-[11px] text-gray-500 tabular-nums leading-tight">{trade.amount}</p>
          <p className="text-[10px] text-gray-300 leading-tight mt-0.5">{formatDate(trade.filingDate)}</p>
        </div>

        {/* AI score badge */}
        <ScoreBadge scoreData={scoreData} />
      </div>

      {/* Reasoning text — only when score is loaded */}
      {scoreData && !scoreData.error && scoreData.reasoning && (
        <p className="text-[11px] text-gray-400 leading-snug mt-1.5 pl-11 pr-1">
          {scoreData.reasoning}
        </p>
      )}
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="skeleton w-8 h-8 rounded-full shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="skeleton h-3 w-28 rounded" />
        <div className="skeleton h-2.5 w-44 rounded" />
      </div>
      <div className="space-y-1.5">
        <div className="skeleton h-3 w-16 rounded ml-auto" />
        <div className="skeleton h-2.5 w-20 rounded ml-auto" />
        <div className="skeleton h-2 w-14 rounded ml-auto" />
      </div>
      <div className="skeleton w-9 h-9 rounded-full shrink-0" />
    </div>
  );
}

// ── Score fetching helpers ────────────────────────────────────────────────────

function getCachedScore(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function setCachedScore(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CongressFeed({ themeColour = '#6366f1' }) {
  const [trades,  setTrades]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  // scores: { [cacheKey]: { score, reasoning } | { error } | null (loading) }
  const [scores,  setScores]  = useState({});

  // Load trades
  useEffect(() => {
    fetch('/api/congress-trades')
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error);
        setTrades(d.trades || []);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Fetch/load scores once trades are available
  useEffect(() => {
    if (!trades.length) return;

    trades.forEach(trade => {
      const key = tradeKey(trade);
      const cached = getCachedScore(key);
      if (cached) {
        setScores(prev => ({ ...prev, [key]: cached }));
        return;
      }

      // Mark as loading (null = spinner)
      setScores(prev => ({ ...prev, [key]: null }));

      const meta = getMeta(trade.name);
      fetch('/api/rank-trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          politician:      meta?.display || trade.name,
          party:           meta?.party   || '',
          committee:       meta?.role    || '',
          ticker:          trade.ticker,
          companyName:     trade.assetDescription || '',
          type:            trade.type,
          amount:          trade.amount,
          transactionDate: trade.transactionDate,
          filingDate:      trade.filingDate,
        }),
      })
        .then(r => r.json())
        .then(result => {
          const value = result.error ? { error: result.error } : { score: result.score, reasoning: result.reasoning };
          setCachedScore(key, value);
          setScores(prev => ({ ...prev, [key]: value }));
        })
        .catch(() => {
          setScores(prev => ({ ...prev, [key]: { error: 'fetch failed' } }));
        });
    });
  }, [trades]);

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
        Congressional Trades
      </h2>

      {loading && (
        <div className="divide-y divide-gray-50">
          {[...Array(6)].map((_, i) => <SkeletonRow key={i} />)}
        </div>
      )}

      {!loading && (error || trades.length === 0) && (
        <div className="py-10 text-center">
          <p className="text-sm text-gray-400">No trades available right now.</p>
          {error && <p className="text-xs text-gray-300 mt-1">{error}</p>}
        </div>
      )}

      {!loading && trades.length > 0 && (
        <div className="divide-y divide-gray-50">
          {trades.map((trade, i) => (
            <TradeRow
              key={i}
              trade={trade}
              themeColour={themeColour}
              scoreData={scores[tradeKey(trade)]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
