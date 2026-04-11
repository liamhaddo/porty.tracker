import fs from 'fs';
import path from 'path';
import { parseCSV, applySplits, buildWeeklySnapshots } from '../../../lib/csvProcessor';

const TRANSACTIONS_PATH = path.join(process.cwd(), 'transactions.csv');

export async function POST(request) {
  try {
    const { prices } = await request.json(); // { ticker: price }

    if (!fs.existsSync(TRANSACTIONS_PATH)) {
      return Response.json({ snapshots: [] });
    }

    const csvText = fs.readFileSync(TRANSACTIONS_PATH, 'utf8');
    const transactions = parseCSV(csvText);
    const adjusted = applySplits(transactions);
    const snapshots = buildWeeklySnapshots(adjusted);

    // Multiply each snapshot's holdings by current prices
    const chartData = snapshots.map(snap => {
      let total = 0;
      for (const [ticker, shares] of Object.entries(snap.holdings)) {
        const price = prices[ticker];
        if (price != null) {
          total += shares * price;
        }
      }
      return {
        date: snap.date,
        value: Math.round(total * 100) / 100,
      };
    });

    return Response.json({ snapshots: chartData });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
