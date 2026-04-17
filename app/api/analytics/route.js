const FMP = process.env.FMP_API_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

const MY_HOLDINGS = ['META', 'NVDA', 'NFLX', 'IONQ', 'ORCL', 'COIN', 'ALAB', 'NAK', 'NB'];
const MAG7_EXTRA  = ['TSLA', 'AAPL', 'AMZN', 'GOOG', 'MSFT'];
const DEFAULT_TICKERS = [...new Set([...MY_HOLDINGS, ...MAG7_EXTRA])];

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const watchlist = Array.isArray(body.watchlist) ? body.watchlist : [];
    const allTickers = [...new Set([...DEFAULT_TICKERS, ...watchlist])];

    // Fetch quotes from Finnhub (already used in this project)
    const FINNHUB = process.env.FINNHUB_API_KEY;
    const quoteResults = await Promise.allSettled(
      allTickers.map(t =>
        fetch(`https://finnhub.io/api/v1/quote?symbol=${t}&token=${FINNHUB}`)
          .then(r => r.json())
          .then(d => ({ ticker: t, c: d.c, d: d.d, dp: d.dp, h: d.h, l: d.l, o: d.o, pc: d.pc }))
      )
    );

    const stockData = quoteResults
      .filter(r => r.status === 'fulfilled' && r.value.c > 0)
      .map(r => {
        const q = r.value;
        return {
          ticker:    q.ticker,
          price:     q.c,
          change1d:  q.dp != null ? +q.dp.toFixed(2) : null,
          high:      q.h,
          low:       q.l,
          open:      q.o,
          prevClose: q.pc,
        };
      });

    if (stockData.length === 0) throw new Error('Finnhub returned no data — check FINNHUB_API_KEY');

    const prompt = buildPrompt(stockData, MY_HOLDINGS, watchlist);
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 2500,
        messages:   [{ role: 'user', content: prompt }],
      }),
    });

    const aiData  = await aiRes.json();
    console.log('[Claude API status]', aiRes.status);
    console.log('[Claude API response]', JSON.stringify(aiData).slice(0, 500));
    const rawText = aiData?.content?.[0]?.text || '';
    const cleaned = rawText.replace(/```json|```/g, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Claude did not return valid JSON');
    const result = JSON.parse(jsonMatch[0]);

    const enrich = (arr) =>
      (arr || []).map(r => ({ ...r, ...(stockData.find(s => s.ticker === r.ticker) || {}) }));

    result.recommendations = enrich(result.recommendations);
    result.holdingsScored  = enrich(result.holdingsScored);
    result.watchlistScored = enrich(result.watchlistScored);
    result.generatedAt     = new Date().toISOString();

    return Response.json(result);
  } catch (err) {
    console.error('[analytics route]', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q');
    if (!q || q.trim().length < 1) return Response.json([]);
    const res  = await fetch(
      `https://financialmodelingprep.com/stable/search-symbol?query=${encodeURIComponent(q)}&limit=6&apikey=${FMP}`
    );
    const data = await res.json();
    return Response.json(Array.isArray(data) ? data : []);
  } catch {
    return Response.json([]);
  }
}

function buildPrompt(stocks, holdings, watchlist) {
  return `You are a professional swing trade analyst specialising in mid-term momentum plays (hold period: days to a few weeks).

LIVE MARKET DATA (from Finnhub API):
${JSON.stringify(stocks, null, 2)}

MY CURRENT HOLDINGS: ${holdings.join(', ')}
MY WATCHLIST: ${watchlist.length ? watchlist.join(', ') : 'none'}

SCORING MODEL — swing-trade optimised:

Momentum (50%):
- change1d: positive and strong (>1%) = buying pressure. Negative = weakness.
- price vs open: price > open = intraday strength.
- price vs prevClose: gap up = momentum. Gap down = weakness.
- high/low range: price near day high = strong. Near day low = weak.

Accumulation (20%):
- Infer from price action: strong close near high of day = accumulation likely.

Quality + Value (30%):
- Use your training knowledge of each company's fundamentals to assess.
- Flag speculative small caps (NAK, NB, IONQ) with liquidity risk warnings.

RULES:
- Select 3-5 top picks only — quality over quantity. Only include if score > 62.
- Small caps (NAK, NB, IONQ) need very strong signals — flag liquidity risk.
- Momentum must be present. Do not recommend on fundamentals alone.
- ai_summary must reference actual data values (e.g. "trading 8% above 50MA").
- Return ONLY raw JSON — no markdown, no explanation, no backticks.

REQUIRED JSON STRUCTURE:
{
  "market_regime": "Bull | Neutral | Defensive",
  "recommendations": [
    {
      "ticker": "",
      "rank": 1,
      "final_score": 0,
      "confidence": "High | Medium | Low",
      "recommendation_type": "New Entry | High Conviction | Momentum Pickup | Re-Entry",
      "factor_scores": { "momentum": 0, "accumulation": 0, "quality": 0, "value": 0 },
      "signals": { "momentum_trend": "Bullish | Neutral | Bearish", "accumulation": "Strong | Moderate | Weak", "valuation": "Cheap | Fair | Expensive" },
      "ai_summary": "",
      "key_drivers": ["", ""]
    }
  ],
  "holdingsScored": [
    { "ticker": "", "final_score": 0, "signal": "Strong | Hold | Watch | Exit", "one_liner": "" }
  ],
  "watchlistScored": [
    {
      "ticker": "",
      "final_score": 0,
      "confidence": "High | Medium | Low",
      "recommendation_type": "",
      "factor_scores": { "momentum": 0, "accumulation": 0, "quality": 0, "value": 0 },
      "signals": { "momentum_trend": "", "accumulation": "", "valuation": "" },
      "ai_summary": "",
      "key_drivers": ["", ""]
    }
  ],
  "watchlist_alerts": [
    { "ticker": "", "reason": "" }
  ]
}`;
}
