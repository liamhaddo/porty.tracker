// All portfolio data lives in localStorage under this key.
// Two users on the same Vercel URL see completely different data.

const KEY = 'porty_portfolios';

export function getPortfolios() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch { return []; }
}

export function savePortfolio(portfolio) {
  const all = getPortfolios();
  const idx = all.findIndex(p => p.id === portfolio.id);
  if (idx >= 0) all[idx] = portfolio;
  else all.push(portfolio);
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function deletePortfolio(id) {
  localStorage.setItem(KEY, JSON.stringify(getPortfolios().filter(p => p.id !== id)));
}

export function newPortfolioId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}
