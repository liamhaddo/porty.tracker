'use client';

function fmtCurrency(value, currency) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export default function SummaryBar({ totalValue, lastUpdated, loading, currency = 'USD', fxRate = 1 }) {
  const elapsed = lastUpdated ? Math.floor((Date.now() - lastUpdated) / 1000) : null;
  const elapsedLabel =
    elapsed === null ? '' :
    elapsed < 5 ? 'just now' :
    elapsed < 60 ? `${elapsed}s ago` :
    `${Math.floor(elapsed / 60)}m ago`;

  return (
    <div className="bg-white rounded-2xl shadow-sm px-5 py-4 flex items-center justify-between gap-4">
      <div>
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">
          Total Portfolio Value
        </p>
        {loading ? (
          <div className="skeleton h-8 w-44 rounded" />
        ) : (
          <p className="text-3xl font-bold text-gray-900 tabular-nums">
            {totalValue != null ? fmtCurrency(totalValue * fxRate, currency) : '—'}
          </p>
        )}
      </div>
      <div className="text-right shrink-0">
        <p className="text-xs text-gray-400">Last updated</p>
        {loading ? (
          <div className="skeleton h-4 w-16 rounded mt-1" />
        ) : (
          <p className="text-xs font-medium text-gray-500">{elapsedLabel || '—'}</p>
        )}
      </div>
    </div>
  );
}
