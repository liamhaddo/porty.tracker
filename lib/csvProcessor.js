/**
 * Processes a transaction CSV into:
 *  1. net holdings per ticker (for holdings.config.js)
 *  2. weekly portfolio snapshots (for the line graph)
 *
 * CSV format (header row):
 *   Trade ID, Trade date, Instrument code, Instrument name, Market code,
 *   Quantity, Price, Transaction type, Currency, Amount, Transaction fee,
 *   Transaction method, Portfolio, Initiated by
 *
 * Split adjustments are loaded from splits.config.js via createRequire.
 */

import fs from 'fs';
import path from 'path';

function getSplits() {
  const splitsPath = path.join(process.cwd(), 'splits.config.js');
  const content = fs.readFileSync(splitsPath, 'utf8');
  const m = { exports: {} };
  // eslint-disable-next-line no-new-func
  new Function('module', 'exports', content)(m, m.exports);
  return m.exports;
}

/**
 * Parse CSV text into an array of transaction objects.
 * Works in Node.js (server-side only).
 */
export function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));

  const transactions = [];
  for (let i = 1; i < lines.length; i++) {
    const row = splitCSVLine(lines[i]);
    if (row.length < 8) continue;

    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = (row[idx] || '').trim().replace(/^"|"$/g, '');
    });

    const type = (obj['Transaction type'] || '').toUpperCase();
    if (type !== 'BUY' && type !== 'SELL') continue;

    const dateStr = obj['Trade date'] || '';
    const date = parseDate(dateStr);
    if (!date) continue;

    const ticker = (obj['Instrument code'] || '').toUpperCase();
    const qty = parseFloat(obj['Quantity']) || 0;

    transactions.push({ ticker, date, qty, type });
  }

  transactions.sort((a, b) => a.date - b.date);
  return transactions;
}

/** Split a CSV line respecting quoted fields */
function splitCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

/** Parse "2025-04-08 15:04:20.531000 (UTC)" or "2025-04-08" into a Date */
function parseDate(str) {
  if (!str) return null;
  const match = str.match(/^(\d{4}-\d{2}-\d{2})/);
  if (!match) return null;
  return new Date(match[1] + 'T00:00:00Z');
}

/**
 * Apply split adjustments to a list of transactions.
 * Pre-split transactions (date < split.date) have their qty multiplied by ratio.
 */
export function applySplits(transactions) {
  const splits = getSplits();
  return transactions.map(tx => {
    let qty = tx.qty;
    for (const split of splits) {
      if (tx.ticker === split.ticker) {
        const splitDate = new Date(split.date + 'T00:00:00Z');
        if (tx.date < splitDate) {
          qty = qty * split.ratio;
        }
      }
    }
    return { ...tx, qty };
  });
}

/**
 * Calculate net holdings (shares per ticker) from a list of transactions.
 */
export function calcNetHoldings(transactions) {
  const holdings = {};
  for (const tx of transactions) {
    if (!holdings[tx.ticker]) holdings[tx.ticker] = 0;
    if (tx.type === 'BUY') {
      holdings[tx.ticker] += tx.qty;
    } else {
      holdings[tx.ticker] -= tx.qty;
    }
  }
  const result = {};
  for (const [ticker, shares] of Object.entries(holdings)) {
    const rounded = Math.round(shares * 10000) / 10000;
    if (rounded > 0.0001) result[ticker] = rounded;
  }
  return result;
}

/**
 * Returns weekly snapshots: array of { date, holdings }
 * where holdings = { ticker: shares } at end of each week (Sunday).
 */
export function buildWeeklySnapshots(transactions) {
  if (transactions.length === 0) return [];

  const firstDate = transactions[0].date;
  const now = new Date();

  const weeks = [];
  const start = getNextSunday(firstDate);
  let current = new Date(start);
  while (current <= now) {
    weeks.push(new Date(current));
    current = new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000);
  }
  const today = new Date(now.toISOString().slice(0, 10) + 'T00:00:00Z');
  if (weeks.length === 0 || weeks[weeks.length - 1].getTime() !== today.getTime()) {
    weeks.push(today);
  }

  const snapshots = [];
  const runningHoldings = {};
  let txIdx = 0;

  for (const weekDate of weeks) {
    while (txIdx < transactions.length && transactions[txIdx].date <= weekDate) {
      const tx = transactions[txIdx];
      if (!runningHoldings[tx.ticker]) runningHoldings[tx.ticker] = 0;
      if (tx.type === 'BUY') {
        runningHoldings[tx.ticker] += tx.qty;
      } else {
        runningHoldings[tx.ticker] -= tx.qty;
      }
      txIdx++;
    }

    const snapshot = {};
    for (const [ticker, shares] of Object.entries(runningHoldings)) {
      if (shares > 0.0001) snapshot[ticker] = shares;
    }

    snapshots.push({ date: weekDate.toISOString().slice(0, 10), holdings: { ...snapshot } });
  }

  return snapshots;
}

function getNextSunday(date) {
  const d = new Date(date);
  const day = d.getUTCDay();
  const daysUntilSunday = day === 0 ? 0 : 7 - day;
  d.setUTCDate(d.getUTCDate() + daysUntilSunday);
  return d;
}
