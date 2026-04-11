// Fetches USD → NZD and AUD exchange rates from open.er-api.com (free, no key).
// Falls back to approximate rates if the API is unreachable.

const FALLBACK = { USD: 1, NZD: 1.65, AUD: 1.55 };

export async function GET() {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      next: { revalidate: 3600 }, // cache for 1 hour
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return Response.json({
      rates: {
        USD: 1,
        NZD: data.rates.NZD,
        AUD: data.rates.AUD,
      },
    });
  } catch (err) {
    console.warn('[fx] rate fetch failed, using fallback:', err.message);
    return Response.json({ rates: FALLBACK });
  }
}
