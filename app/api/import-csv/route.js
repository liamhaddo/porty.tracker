import fs from 'fs';
import path from 'path';
import { parseCSV, applySplits, calcNetHoldings } from '../../../lib/csvProcessor';

const HOLDINGS_PATH = path.join(process.cwd(), 'holdings.config.js');
const TRANSACTIONS_PATH = path.join(process.cwd(), 'transactions.csv');

function writeHoldings(holdings) {
  const lines = holdings.map(
    h => `  { ticker: '${h.ticker}', shares: ${h.shares} },`
  );
  const content =
    `// Current holdings — edit manually or via the app's "Add Holding" button.\n` +
    `// ticker: stock symbol (must match Yahoo Finance)\n` +
    `// shares: number of shares (post-split adjusted)\n\n` +
    `module.exports = [\n${lines.join('\n')}\n];\n`;
  fs.writeFileSync(HOLDINGS_PATH, content, 'utf8');
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { csvText, mode } = body; // mode: 'replace' | 'merge'

    if (!csvText) {
      return Response.json({ error: 'csvText required' }, { status: 400 });
    }

    let finalCsvText = csvText;

    if (mode === 'merge') {
      let existing = '';
      if (fs.existsSync(TRANSACTIONS_PATH)) {
        existing = fs.readFileSync(TRANSACTIONS_PATH, 'utf8');
      }

      if (existing) {
        const newLines = csvText.trim().split('\n');
        const existingLines = existing.trim().split('\n');
        const existingIds = new Set(existingLines.slice(1).map(l => l.split(',')[0]));
        const newRows = newLines.slice(1).filter(l => {
          const id = l.split(',')[0];
          return id && !existingIds.has(id);
        });
        finalCsvText = [...existingLines, ...newRows].join('\n');
      }
    }

    fs.writeFileSync(TRANSACTIONS_PATH, finalCsvText, 'utf8');

    const transactions = parseCSV(finalCsvText);
    const adjusted = applySplits(transactions);
    const netHoldings = calcNetHoldings(adjusted);

    const holdingsArray = Object.entries(netHoldings)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ticker, shares]) => ({ ticker, shares }));

    writeHoldings(holdingsArray);

    return Response.json({ ok: true, holdings: holdingsArray, count: holdingsArray.length });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
