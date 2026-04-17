// Client-safe chart calculation — no Node.js / fs dependencies.
// Mirrors the logic in lib/csvProcessor.js for use in browser components.

import { SPLITS } from './splitsConfig';

// ─── CSV Parsing ────────────────────────────────────────────────────────────

/** Split a single CSV line respecting double-quoted fields. */
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

/**
 * Parse "2025-04-08 15:04:20.531000 (UTC)" or "2025-04-08" into a full ISO string.
 * Returns null if the string doesn't contain a recognisable date.
 */
function parseDate(str) {
  const match = (str || '').match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? new Date(match[1] + 'T00:00:00.000Z').toISOString() : null;
}

/**
 * Parse a broker CSV string into raw transaction rows.
 *
 * Expected columns (whitespace-trimmed header names):
 *   Instrument code, Trade date, Quantity, Price, Transaction type
 *
 * Returns: { ticker, date (ISO string), quantity, price, type ('BUY'|'SELL') }[]
 */
export function parseCSVToTransactions(csvText) {
  // Handle both Unix (\n) and Windows (\r\n) line endings
  const lines = (csvText || '').trim().split(/\r?\n/);
  console.log('[CSV] line count:', lines.length, 'first line:', lines[0]);
  if (lines.length < 2) return [];

  // Use the quote-aware splitter for the header row too
  const headers = splitCSVLine(lines[0]).map(h => h.trim().replace(/^"|"$/g, ''));
  console.log('[CSV] headers found:', headers);

  const transactions = [];

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue; // skip blank lines

    const row = splitCSVLine(rawLine);
    if (row.length < 8) continue;

    const obj = {};
    headers.forEach((h, idx) => { obj[h] = (row[idx] || '').trim().replace(/^"|"$/g, ''); });

    const type = (obj['Transaction type'] || '').toUpperCase();
    if (type !== 'BUY' && type !== 'SELL') continue;

    const date = parseDate(obj['Trade date'] || '');
    if (!date) continue;

    const ticker = (obj['Instrument code'] || '').toUpperCase();
    if (!ticker) continue;

    const quantity = parseFloat(obj['Quantity']);
    const price    = parseFloat(obj['Price']);

    if (!quantity || quantity <= 0) continue;
    if (!price    || price    <= 0) continue;

    transactions.push({ ticker, date, quantity, price, type });
  }

  return transactions.sort((a, b) => a.date.localeCompare(b.date));
}

// ─── Split adjustment ────────────────────────────────────────────────────────

/**
 * Multiply pre-split quantities by ratio for transactions before the split date.
 * Handles both legacy {qty} and new {quantity} transaction shapes.
 */
export function applySplitsToTransactions(transactions) {
  return transactions.map(tx => {
    // Support both old (qty) and new (quantity) field names
    let quantity = tx.quantity ?? tx.qty ?? 0;
    for (const split of SPLITS) {
      // tx.date may be a full ISO string — compare only the date portion
      if (tx.ticker === split.ticker && tx.date.slice(0, 10) < split.date) {
        quantity = quantity * split.ratio;
      }
    }
    return { ...tx, quantity };
  });
}

// ─── Net holdings ────────────────────────────────────────────────────────────

/**
 * Calculate net share counts from split-adjusted transactions.
 * Returns: { ticker, shares }[]
 * Handles both legacy {qty} and new {quantity} transaction shapes.
 */
export function calcNetHoldings(transactions) {
  const map = {};
  for (const tx of transactions) {
    const q = tx.quantity ?? tx.qty ?? 0;
    map[tx.ticker] = (map[tx.ticker] || 0) + (tx.type === 'BUY' ? q : -q);
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
 * Handles both legacy {qty} and new {quantity} transaction shapes.
 * tx.date may be a full ISO string — only the YYYY-MM-DD portion is used for
 * bucketing, keeping comparisons consistent with weekDate strings.
 */
export function buildChartData(transactions, prices) {
  if (!transactions || transactions.length === 0) return [];

  const today = new Date().toISOString().slice(0, 10);
  const weeks = [];
  // Normalise the first transaction date to YYYY-MM-DD for nextSunday
  let cur = nextSunday(transactions[0].date.slice(0, 10));
  while (cur <= today) { weeks.push(cur); cur = addDays(cur, 7); }
  if (!weeks.length || weeks[weeks.length - 1] !== today) weeks.push(today);

  const holdings = {};
  let txIdx = 0;

  return weeks.map(weekDate => {
    // Compare only date portion of tx.date against weekDate (YYYY-MM-DD)
    while (txIdx < transactions.length && transactions[txIdx].date.slice(0, 10) <= weekDate) {
      const tx = transactions[txIdx++];
      const q = tx.quantity ?? tx.qty ?? 0;
      holdings[tx.ticker] = (holdings[tx.ticker] || 0) + (tx.type === 'BUY' ? q : -q);
    }
    let total = 0;
    for (const [ticker, shares] of Object.entries(holdings)) {
      if (shares > 0.0001 && prices[ticker] != null) total += shares * prices[ticker];
    }
    return { date: weekDate, value: Math.round(total * 100) / 100 };
  });
}
