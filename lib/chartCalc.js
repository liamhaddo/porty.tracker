// Client-safe chart calculation — no Node.js / fs dependencies.
// Mirrors the logic in lib/csvProcessor.js for use in browser components.

import { SPLITS } from './splitsConfig';

// ─── CSV Parsing ────────────────────────────────────────────────────────────

function splitCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === ',' && !inQuotes) { result.push(current); current = ''; }
    else current += ch;
  }
  result.push(current);
  return result;
}

function parseDate(str) {
  const match = (str || '').match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

/** Parse a broker CSV string into raw transaction rows. */
export function parseCSVToTransactions(csvText) {
  const lines = (csvText || '').trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const transactions = [];

  for (let i = 1; i < lines.length; i++) {
    const row = splitCSVLine(lines[i]);
    if (row.length < 8) continue;
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = (row[idx] || '').trim().replace(/^"|"$/g, ''); });

    const type = (obj['Transaction type'] || '').toUpperCase();
    if (type !== 'BUY' && type !== 'SELL') continue;

    const date = parseDate(obj['Trade date'] || '');
    if (!date) continue;

    const ticker = (obj['Instrument code'] || '').toUpperCase();
    const qty = parseFloat(obj['Quantity']) || 0;
    if (!ticker || qty <= 0) continue;

    transactions.push({ ticker, date, qty, type });
  }

  return transactions.sort((a, b) => a.date.localeCompare(b.date));
}

// ─── Split adjustment ────────────────────────────────────────────────────────

/** Multiply pre-split quantities by ratio for transactions before the split date. */
export function applySplitsToTransactions(transactions) {
  return transactions.map(tx => {
    let qty = tx.qty;
    for (const split of SPLITS) {
      if (tx.ticker === split.ticker && tx.date < split.date) {
        qty = qty * split.ratio;
      }
    }
    return { ...tx, qty };
  });
}

// ─── Net holdings ────────────────────────────────────────────────────────────

/** Calculate net share counts from split-adjusted transactions. */
export function calcNetHoldings(transactions) {
  const map = {};
  for (const tx of transactions) {
    map[tx.ticker] = (map[tx.ticker] || 0) + (tx.type === 'BUY' ? tx.qty : -tx.qty);
  }
  return Object.entries(map)
    .filter(([, s]) => s > 0.0001)
    .map(([ticker, shares]) => ({ ticker, shares: Math.round(shares * 10000) / 10000 }))
    .sort((a, b) => a.ticker.localeCompare(b.ticker));
}

// ─── Weekly snapshots ─────────────────────────────────────────────────────────

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function nextSunday(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  const daysAhead = d.getUTCDay() === 0 ? 0 : 7 - d.getUTCDay();
  return addDays(dateStr, daysAhead);
}

/**
 * Build weekly { date, value } pairs from split-adjusted transactions and
 * current prices. Values are in USD (multiply by fxRate in the component).
 */
export function buildChartData(transactions, prices) {
  if (!transactions || transactions.length === 0) return [];

  const today = new Date().toISOString().slice(0, 10);
  const weeks = [];
  let cur = nextSunday(transactions[0].date);
  while (cur <= today) { weeks.push(cur); cur = addDays(cur, 7); }
  if (!weeks.length || weeks[weeks.length - 1] !== today) weeks.push(today);

  const holdings = {};
  let txIdx = 0;

  return weeks.map(weekDate => {
    while (txIdx < transactions.length && transactions[txIdx].date <= weekDate) {
      const tx = transactions[txIdx++];
      holdings[tx.ticker] = (holdings[tx.ticker] || 0) + (tx.type === 'BUY' ? tx.qty : -tx.qty);
    }
    let total = 0;
    for (const [ticker, shares] of Object.entries(holdings)) {
      if (shares > 0.0001 && prices[ticker] != null) total += shares * prices[ticker];
    }
    return { date: weekDate, value: Math.round(total * 100) / 100 };
  });
}
