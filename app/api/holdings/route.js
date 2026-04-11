import fs from 'fs';
import path from 'path';

const HOLDINGS_PATH = path.join(process.cwd(), 'holdings.config.js');

function readHoldings() {
  const content = fs.readFileSync(HOLDINGS_PATH, 'utf8');
  const m = { exports: {} };
  // eslint-disable-next-line no-new-func
  new Function('module', 'exports', content)(m, m.exports);
  return m.exports;
}

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

export async function GET() {
  try {
    const holdings = readHoldings();
    return Response.json({ holdings });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, ticker, shares, holdings: newHoldings } = body;

    if (action === 'replace') {
      if (!Array.isArray(newHoldings)) {
        return Response.json({ error: 'holdings array required' }, { status: 400 });
      }
      writeHoldings(newHoldings);
      return Response.json({ ok: true });
    }

    if (!ticker || !shares) {
      return Response.json({ error: 'ticker and shares required' }, { status: 400 });
    }

    const current = readHoldings();
    const upperTicker = ticker.toUpperCase();
    const existing = current.find(h => h.ticker === upperTicker);

    let updated;
    if (existing) {
      updated = current.map(h =>
        h.ticker === upperTicker ? { ...h, shares: parseFloat(shares) } : h
      );
    } else {
      updated = [...current, { ticker: upperTicker, shares: parseFloat(shares) }];
    }

    writeHoldings(updated);
    return Response.json({ ok: true, holdings: updated });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
