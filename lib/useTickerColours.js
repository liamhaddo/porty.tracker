'use client';

import { useState, useEffect } from 'react';

const CACHE_PREFIX = 'porty_ticker_colour_';

// One-time cache clear so the improved extraction algorithm runs fresh.
// Remove this block after confirming colours look correct.
if (typeof window !== 'undefined') {
  Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX)).forEach(k => localStorage.removeItem(k));
}

function getCached(ticker) {
  try { return localStorage.getItem(CACHE_PREFIX + ticker) || null; } catch { return null; }
}

function setCache(ticker, colour) {
  try { localStorage.setItem(CACHE_PREFIX + ticker, colour); } catch {}
}

function getDominantColour(img) {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

  let bestColour = null;
  let bestScore = -1;

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 128) continue; // skip transparent

    const r = data[i], g = data[i + 1], b = data[i + 2];

    // skip near-white (all channels high)
    if (r > 230 && g > 230 && b > 230) continue;
    // skip near-black (all channels low)
    if (r < 20 && g < 20 && b < 20) continue;

    // calculate saturation as max-min channel difference
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const saturation = max === 0 ? 0 : (max - min) / max;

    // skip low-saturation (grey-ish) pixels
    if (saturation < 0.3) continue;

    // score = saturation × brightness — rewards vivid colours
    const brightness = max / 255;
    const score = saturation * brightness;

    if (score > bestScore) {
      bestScore = score;
      bestColour = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
    }
  }

  return bestColour; // returns null if no vivid pixel found — caller handles fallback
}

async function extractColourFromUrl(ticker, url) {
  return new Promise((resolve) => {
    const img = new Image();
    // crossOrigin MUST be set before src or the canvas will be tainted.
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const hex = getDominantColour(img);
        console.log(`[porty] ${ticker}: extracted colour ${hex}`);
        resolve(hex);
      } catch (err) {
        console.log(`[porty] ${ticker}: canvas extraction error — ${err.message}`);
        resolve(null);
      }
    };
    img.onerror = () => {
      console.log(`[porty] ${ticker}: logo image failed to load`);
      resolve(null);
    };
    img.src = url;
  });
}

/**
 * Extracts and caches dominant brand colours for a list of tickers using logo.dev.
 * Returns a map of { [ticker]: '#hexcolour' }.
 * Falls back to themeColour for tickers whose logo fails to load.
 */
export function useTickerColours(tickers, themeColour) {
  const [colours, setColours] = useState({});
  const tickerKey = tickers.join(',');

  useEffect(() => {
    if (!tickers.length) return;
    const token = process.env.NEXT_PUBLIC_LOGO_DEV_KEY;

    // Immediately apply anything already in localStorage
    const cached = {};
    const toFetch = [];
    for (const ticker of tickers) {
      const c = getCached(ticker);
      if (c) { cached[ticker] = c; } else { toFetch.push(ticker); }
    }
    if (Object.keys(cached).length) {
      setColours(prev => ({ ...prev, ...cached }));
    }
    if (!toFetch.length || !token) return;

    let cancelled = false;
    (async () => {
      for (const ticker of toFetch) {
        if (cancelled) break;
        const url = `https://img.logo.dev/ticker/${ticker}?token=${token}&retina=true`;
        const colour = await extractColourFromUrl(ticker, url);
        const resolved = colour || themeColour;
        setCache(ticker, resolved);
        if (!cancelled) setColours(prev => ({ ...prev, [ticker]: resolved }));
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickerKey, themeColour]);

  return colours;
}
