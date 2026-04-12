'use client';

import { useState } from 'react';

function fmtCurrency(value, currency) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

const fmtPct = (v) => `${v.toFixed(1)}%`;

function TickerLogo({ ticker, themeColour }) {
  const [errored, setErrored] = useState(false);
  const token = process.env.NEXT_PUBLIC_LOGO_DEV_KEY;

  if (errored || !token) {
    return (
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
        style={{ backgroundColor: themeColour }}
      >
        {ticker.slice(0, 2)}
      </div>
    );
  }

  return (
    <div className="w-7 h-7 rounded-full overflow-hidden bg-gray-50 shrink-0 flex items-center justify-center">
      <img
        src={`https://img.logo.dev/ticker/${ticker}?token=${token}&retina=true`}
        alt={ticker}
        width={28}
        height={28}
        className="object-contain"
        onError={() => setErrored(true)}
      />
    </div>
  );
}

function HoldingRow({ holding, price, pct, loading, currency, fxRate, themeColour }) {
  const valueUSD = price != null ? holding.shares * price : null;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors rounded-xl">
      <TickerLogo ticker={holding.ticker} themeColour={themeColour} />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800">{holding.ticker}</p>
        <p className="text-xs text-gray-400 tabular-nums">
          {holding.shares.toFixed(4)} shares
        </p>
      </div>

      <div className="text-right tabular-nums shrink-0">
        {loading ? (
          <>
            <div className="skeleton h-4 w-16 rounded mb-1 ml-auto" />
            <div className="skeleton h-3 w-10 rounded ml-auto" />
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-gray-800">
              {valueUSD != null ? fmtCurrency(valueUSD * fxRate, currency) : '—'}
            </p>
            <p className="text-xs text-gray-400">
              {price != null ? fmtCurrency(price * fxRate, currency) : '—'} · {pct != null ? fmtPct(pct) : '—'}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function HoldingsList({ holdings, prices, loading, currency = 'USD', fxRate = 1, themeColour = '#6366f1' }) {
  const total = holdings.reduce((s, h) => {
    const p = prices[h.ticker];
    return s + (p != null ? h.shares * p : 0);
  }, 0);

  const sorted = [...holdings].sort((a, b) => {
    const va = prices[a.ticker] != null ? a.shares * prices[a.ticker] : 0;
    const vb = prices[b.ticker] != null ? b.shares * prices[b.ticker] : 0;
    return vb - va;
  });

  return (
    <div className="bg-white rounded-2xl shadow-sm p-3 sm:p-4">
      <div className="flex items-center justify-between mb-1 px-1">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Holdings
        </h2>
        <span className="text-xs text-gray-400">{holdings.length} positions</span>
      </div>

      <div className="divide-y divide-gray-50">
        {sorted.map((h) => {
          const value = prices[h.ticker] != null ? h.shares * prices[h.ticker] : null;
          const pct = total > 0 && value != null ? (value / total) * 100 : null;
          return (
            <HoldingRow
              key={h.ticker}
              holding={h}
              price={prices[h.ticker] ?? null}
              pct={pct}
              loading={loading}
              currency={currency}
              fxRate={fxRate}
              themeColour={themeColour}
            />
          );
        })}
      </div>
    </div>
  );
}
