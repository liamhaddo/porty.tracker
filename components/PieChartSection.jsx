'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useState } from 'react';

const COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#3b82f6', '#ef4444',
  '#8b5cf6', '#14b8a6', '#f97316', '#ec4899',
];

function fmtCurrency(value, currency) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

const fmtPct = (v) => `${v.toFixed(1)}%`;

function CustomTooltip({ active, payload, currency, fxRate }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-3 py-2 text-sm">
      <p className="font-semibold text-gray-800">{d.ticker}</p>
      <p className="text-gray-600">{fmtCurrency(d.value * fxRate, currency)}</p>
      <p className="text-gray-400">{fmtPct(d.pct)}</p>
    </div>
  );
}

export default function PieChartSection({ holdings, prices, loading, currency = 'USD', fxRate = 1 }) {
  const [activeIndex, setActiveIndex] = useState(null);

  const data = holdings
    .map((h) => {
      const price = prices[h.ticker];
      const value = price != null ? h.shares * price : 0;
      return { ticker: h.ticker, value };
    })
    .filter((d) => d.value > 0);

  const total = data.reduce((s, d) => s + d.value, 0);
  const chartData = data
    .map((d) => ({ ...d, pct: total > 0 ? (d.value / total) * 100 : 0 }))
    .sort((a, b) => b.value - a.value);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <div className="skeleton h-5 w-32 rounded mb-4" />
        <div className="flex flex-col sm:flex-row gap-6 items-center">
          <div className="skeleton rounded-full w-48 h-48 shrink-0" />
          <div className="flex-1 w-full space-y-2">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="skeleton h-4 w-full rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
        Allocation
      </h2>
      <div className="flex flex-col sm:flex-row gap-6 items-center">
        <div className="w-48 h-48 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={88}
                paddingAngle={2}
                dataKey="value"
                onMouseEnter={(_, index) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
                stroke="none"
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={entry.ticker}
                    fill={COLORS[index % COLORS.length]}
                    opacity={activeIndex === null || activeIndex === index ? 1 : 0.5}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip currency={currency} fxRate={fxRate} />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex-1 w-full">
          <div className="grid grid-cols-1 gap-0.5">
            {chartData.map((d, index) => (
              <div
                key={d.ticker}
                className="flex items-center justify-between py-1 px-1 rounded-lg hover:bg-gray-50 cursor-default transition-colors"
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-xs font-semibold text-gray-800">{d.ticker}</span>
                </div>
                <div className="flex items-center gap-3 text-right shrink-0 ml-2">
                  <span className="text-xs text-gray-400 tabular-nums w-10 text-right">
                    {fmtPct(d.pct)}
                  </span>
                  <span className="text-xs text-gray-600 tabular-nums w-24 text-right">
                    {fmtCurrency(d.value * fxRate, currency)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
