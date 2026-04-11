// Stock split history — used when processing transaction CSV data for the line graph.
// Add splits here as an array of { ticker, date, ratio } objects.
//
// When building historical holdings:
//   - All BUY/SELL quantities for `ticker` with a trade date BEFORE `date`
//     are multiplied by `ratio` (pre-split → post-split conversion).
//
// Example: NFLX did a 10:1 split. Transactions before 2026-01-01 recorded
// fractional pre-split shares — multiply those by 10 to get post-split equivalents.

module.exports = [
  {
    ticker: 'NFLX',
    date: '2026-01-01',  // best-estimate date — adjust here if needed
    ratio: 10,
  },
];
