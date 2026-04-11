# Portfolio Tracker

A personal investment portfolio tracker that shows live prices, a pie chart of allocation, a line graph of portfolio value over time, and a clean list of all holdings.

---

## Requirements

You need **Node.js** installed on your computer. If you don't have it:

1. Go to https://nodejs.org
2. Download the **LTS** version (the green button)
3. Install it — all defaults are fine
4. Restart your terminal / PowerShell after installing

---

## Setup (one-time)

Open a terminal (PowerShell or Command Prompt) and run:

```
cd "C:\Users\lhadd\Desktop\Portfolio Website\tracker"
npm install
```

This downloads all the packages the app needs. It only needs to be done once.

---

## Running the app

```
cd "C:\Users\lhadd\Desktop\Portfolio Website\tracker"
npm run dev
```

Then open your browser and go to: **http://localhost:3000**

The app will keep running until you close the terminal or press `Ctrl + C`.

---

## Files you might want to edit

### `holdings.config.js`
Your current stock positions. Each line is one holding:

```js
{ ticker: 'META', shares: 6.0000 },
```

- **ticker** — the stock symbol exactly as it appears on Yahoo Finance
- **shares** — the number of shares you hold (post-split adjusted)

You can edit this file directly in a text editor, or use the "+ Add Holding" button in the app.

### `splits.config.js`
A list of stock splits used when calculating the historical line graph. If a company you hold does a stock split, add it here:

```js
{ ticker: 'TSLA', date: '2022-08-25', ratio: 3 },
```

- **ticker** — the stock symbol
- **date** — the split date in `YYYY-MM-DD` format
- **ratio** — how many new shares for each old share (e.g. `3` for a 3:1 split, `10` for a 10:1 split)

Pre-loaded: **NFLX 10:1 split** on 2026-01-01 (best-estimate date — change if needed).

### `transactions.csv`
Your full transaction history. This is used to power the line graph. The app reads it automatically on startup. You can update it by using the "Import CSV" button in the app, or by replacing the file directly.

---

## Importing a new CSV

1. Click **Import CSV** in the top-right of the app
2. Select your exported broker CSV
3. Choose:
   - **Replace** — wipe everything and recalculate from the new file only
   - **Merge** — combine the new file with existing transactions (skips duplicates by Trade ID)
4. The app recalculates all holdings and updates the line graph automatically

The CSV must use this exact column format:
```
Trade ID, Trade date, Instrument code, Instrument name, Market code, Quantity, Price, Transaction type, Currency, Amount, Transaction fee, Transaction method, Portfolio, Initiated by
```

---

## Prices

Live prices are fetched from Yahoo Finance every 60 seconds. An internet connection is required for prices to update. If a price fails to load, the app shows `—` for that position without crashing.

---

## Adding stock logos

Logos are loaded from Clearbit's logo service using each company's primary domain. If a new ticker you add doesn't show a logo, you can add its domain to `lib/domains.js`:

```js
AAPL: 'apple.com',
```

---

## Troubleshooting

**"npm is not recognized"** — Node.js is not installed. Follow the setup instructions above.

**Prices show "—"** — Check your internet connection. Yahoo Finance may also occasionally rate-limit requests; they'll retry on the next 60-second refresh.

**Line graph is flat or empty** — Make sure `transactions.csv` is in the `tracker` folder (not the parent folder). The file should have a header row followed by transaction rows.
