'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// Format "2025-04-13" → "Apr 25"
function formatMonthYear(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00Z');
  const mon = d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
  const yr = String(d.getUTCFullYear()).slice(2);
  return `${mon} ${yr}`;
}

// "2025-04-13" → "2025-04" (used for deduplication)
function monthKey(dateStr) {
  return dateStr ? dateStr.slice(0, 7) : '';
}

// Short symbol for the Y-axis (space is tight)
const AXIS_SYMBOL = { USD: '$', NZD: 'NZ$', AUD: 'A$' };

function fmtCurrency(value, currency) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function CustomTooltip({ active, payload, label, currency, fxRate }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-3 py-2 text-sm">
      <p className="text-gray-500 text-xs mb-1">{formatMonthYear(label)}</p>
      <p className="font-semibold text-gray-800">
        {fmtCurrency(payload[0].value * fxRate, currency)}
      </p>
    </div>
  );
}

// Builds the set of date strings that should show a tick label:
// one per calendar month, capped at maxTicks to prevent crowding.
function buildTickSet(data, maxTicks = 8) {
  const seenMonths = new Set();
  const candidates = [];
  for (const d of data) {
    const mk = monthKey(d.date);
    if (!seenMonths.has(mk)) {
      seenMonths.add(mk);
      candidates.push(d.date);
    }
  }
  if (candidates.length <= maxTicks) return new Set(candidates);
  const stride = Math.ceil(candidates.length / maxTicks);
  return new Set(candidates.filter((_, i) => i % stride === 0));
}

function CustomXAxisTick({ x, y, payload, tickSet }) {
  if (!tickSet?.has(payload.value)) return null;
  return (
    <text x={x} y={y + 12} textAnchor="middle" fill="#9ca3af" fontSize={10}>
      {formatMonthYear(payload.value)}
    </text>
  );
}

export default function LineGraph({ chartData, loading, currency = 'USD', fxRate = 1, themeColour = '#6366f1' }) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <div className="skeleton h-5 w-40 rounded mb-4" />
        <div className="skeleton h-52 w-full rounded-xl" />
      </div>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Portfolio Value Over Time
        </h2>
        <p className="text-gray-400 text-sm">No transaction data available.</p>
      </div>
    );
  }

  const tickSet = buildTickSet(chartData);
  const sym = AXIS_SYMBOL[currency] ?? '$';

  // Y-axis domain based on converted values
  const values = chartData.map(d => d.value * fxRate).filter(v => v > 0);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const padding = (maxVal - minVal) * 0.1 || maxVal * 0.1;
  const yMin = Math.max(0, Math.floor((minVal - padding) / 500) * 500);
  const yMax = Math.ceil((maxVal + padding) / 500) * 500;

  // Y-axis label width is wider for NZ$/A$ prefixes
  const yWidth = sym.length > 1 ? 52 : 44;

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
        Portfolio Value Over Time
      </h2>
      <div className="h-56 sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis
              dataKey="date"
              tick={<CustomXAxisTick tickSet={tickSet} />}
              axisLine={false}
              tickLine={false}
              interval={0}
              height={28}
            />
            <YAxis
              domain={[yMin, yMax]}
              tickFormatter={(v) => `${sym}${(v / 1000).toFixed(0)}k`}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9ca3af', fontSize: 10 }}
              width={yWidth}
            />
            <Tooltip content={<CustomTooltip currency={currency} fxRate={fxRate} />} />
            <Line
              type="monotone"
              dataKey="value"
              stroke={themeColour}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: themeColour, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
