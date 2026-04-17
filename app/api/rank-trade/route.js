// Scores a single congressional trade 1-10 using Claude Haiku.
// Called client-side per trade; scores should be cached in localStorage
// by the caller so this route is only hit once per unique trade.

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env automatically

const SYSTEM_PROMPT = `You are an expert analyst scoring congressional stock trades for retail investors who follow politician trading signals.

Score the trade from 1 to 10 based on these factors:

1. POLITICIAN TRACK RECORD (most weight)
   - Nancy Pelosi / Paul Pelosi: legendary track record, score +3
   - Josh Gottheimer: strong Financial Services committee edge, score +2
   - Tommy Tuberville / Markwayne Mullin: Armed Services committee defense edge, score +2
   - Michael McCaul: Foreign Affairs / Homeland Security edge, score +1

2. TRADE SIZE (conviction signal)
   - $1,001–$15,000: low conviction, score +0
   - $15,001–$50,000: medium conviction, score +1
   - $50,001–$500,000: high conviction, score +2
   - $500,001+: very high conviction, score +3

3. TRANSACTION TYPE
   - Purchase/Buy: stronger signal than a sale, score +1
   - Sale: neutral, score +0

4. SECTOR (committee alignment bonus)
   - AI, semiconductors, cloud, defence/aerospace, fintech, cybersecurity: score +1
   - Any other sector: score +0

5. TIMING
   - If the sector is currently high-activity (AI/chips/defence in 2024-2025): score +1

Combine all factors into a final score from 1 (ignore) to 10 (strong signal worth following).

Respond with valid JSON only. No preamble, no explanation outside the JSON.
Format: {"score": 7, "reasoning": "One concise sentence explaining the score."}`;

export async function POST(request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'ANTHROPIC_API_KEY not configured in .env.local' }, { status: 500 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { politician, party, committee, ticker, companyName, type, amount, transactionDate, filingDate } = body;

  if (!ticker || !type) {
    return Response.json({ error: 'ticker and type are required' }, { status: 400 });
  }

  const userMessage = `Score this congressional trade:
- Politician: ${politician || 'Unknown'} (${party || '?'}) — ${committee || 'Unknown committee'}
- Ticker: ${ticker}${companyName ? ` (${companyName})` : ''}
- Transaction: ${type}
- Amount: ${amount || 'Unknown'}
- Transaction date: ${transactionDate || 'Unknown'}
- Filing date: ${filingDate || 'Unknown'}`;

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const raw = message.content[0]?.text?.trim() ?? '';

    // Extract JSON even if Claude wraps it in backticks
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in Claude response');

    const parsed = JSON.parse(jsonMatch[0]);
    const score = Math.min(10, Math.max(1, Math.round(Number(parsed.score))));
    const reasoning = String(parsed.reasoning || '').slice(0, 200);

    return Response.json({ score, reasoning });
  } catch (err) {
    console.error('[rank-trade]', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
