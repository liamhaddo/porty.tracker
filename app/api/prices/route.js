// Fetches live prices from Finnhub's free quote API.
// Docs: https://finnhub.io/docs/api/quote
// The `c` field in each response is the current price.

const FINNHUB_BASE = 'https://finnhub.io/api/v1/quote';

export async function POST(request) {
  try {
    const { tickers } = await request.json();
    if (!tickers || !Array.isArray(tickers) || tickers.length === 0) {
      return Response.json({ error: 'tickers array required' }, { status: 400 });
    }

    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) {
      return Response.json({ error: 'FINNHUB_API_KEY not set in .env.local' }, { status: 500 });
    }

    const results = await Promise.all(
      tickers.map(async (ticker) => {
        try {
          const res = await fetch(`${FINNHUB_BASE}?symbol=${ticker}&token=${apiKey}`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          // `c` is current price; 0 means no data for that symbol
          const price = data.c && data.c !== 0 ? data.c : null;
          return [ticker, price];
        } catch (err) {
          console.error(`[prices] ${ticker} failed:`, err.message);
          return [ticker, null];
        }
      })
    );

    const prices = Object.fromEntries(results);

    const missing = Object.entries(prices)
      .filter(([, v]) => v === null)
      .map(([k]) => k);
    if (missing.length) console.warn('[prices] no price for:', missing.join(', '));

    return Response.json({ prices });
  } catch (err) {
    console.error('[prices] route error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
