// Fetches congressional trade disclosures from FMP and returns only the
// 5 tracked politicians, sorted by most-recent filing date.
// Responses are cached for 1 hour at the Next.js fetch layer so we stay
// well within FMP's 250 free calls/day limit.
//
// NOTE: FMP free tier only allows page=0 with limit=20 per endpoint.
// Pagination (page=1, page=2) and limits above 20 are premium-gated and
// return a non-JSON "Premium Query Parameter" string. safeJson() handles
// this gracefully by returning [] so the rest of the feed still works.

const SENATE_URL = 'https://financialmodelingprep.com/stable/senate-latest';
const HOUSE_URL  = 'https://financialmodelingprep.com/stable/house-latest';
const LIMIT = 20;

const TRACKED = ['pelosi', 'tuberville', 'mullin', 'gottheimer', 'mccaul'];

function matches(name) {
  if (!name) return false;
  const lower = name.toLowerCase();
  return TRACKED.some(t => lower.includes(t));
}

// Normalise various date formats to YYYY-MM-DD for consistent sorting.
function toIso(d) {
  if (!d) return '';
  const mdy = d.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) return `${mdy[3]}-${mdy[1].padStart(2, '0')}-${mdy[2].padStart(2, '0')}`;
  return d.slice(0, 10);
}

// Safe JSON parse — FMP returns a plain-text "Premium..." string when a
// limit or page exceeds the free tier instead of a proper error code.
async function safeJson(res) {
  if (!res.ok) return [];
  const text = await res.text();
  if (!text.trim().startsWith('[') && !text.trim().startsWith('{')) return [];
  try { return JSON.parse(text); } catch { return []; }
}

export async function GET() {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'FMP_API_KEY not configured' }, { status: 500 });
  }

  try {
    const fetchOpts = { next: { revalidate: 3600 } };
    const [senRes, houRes] = await Promise.all([
      fetch(`${SENATE_URL}?apikey=${apiKey}&limit=${LIMIT}`, fetchOpts),
      fetch(`${HOUSE_URL}?apikey=${apiKey}&limit=${LIMIT}`,  fetchOpts),
    ]);

    const senateRaw = await safeJson(senRes);
    const houseRaw  = await safeJson(houRes);

    // Normalise both chambers — same field structure in the stable API.
    const normalize = (raw, source) =>
      (Array.isArray(raw) ? raw : [])
        .map(t => {
          const name = `${t.firstName || ''} ${t.lastName || ''}`.trim();
          return { ...t, _name: name };
        })
        .filter(t => matches(t._name))
        .map(t => ({
          source,
          name:             t._name,
          ticker:           (t.symbol || t.ticker || '').replace(/[-–—]+$/, '').trim().toUpperCase(),
          type:             t.type || '',
          amount:           t.amount || '',
          assetDescription: t.assetDescription || '',
          filingDate:       toIso(t.disclosureDate || t.dateRecieved || t.transactionDate),
          transactionDate:  toIso(t.transactionDate),
        }));

    const trades = [...normalize(senateRaw, 'senate'), ...normalize(houseRaw, 'house')]
      .filter(t => t.ticker && t.ticker.length > 0 && !t.ticker.startsWith('-'))
      .sort((a, b) => b.filingDate.localeCompare(a.filingDate));

    return Response.json({ trades });
  } catch (err) {
    console.error('[congress-trades]', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
