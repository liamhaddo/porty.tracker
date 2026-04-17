'use client';

import { useState } from 'react';
import { PieChart, BarChart2, Settings } from 'lucide-react';
import Logo from './Logo';

const ACCENT = '#2E6F40';
const CURRENCIES = ['USD', 'NZD', 'AUD'];
const NAV_ITEMS = [
  { id: 'portfolio', Icon: PieChart,  label: 'Portfolio' },
  { id: 'analytics', Icon: BarChart2, label: 'Analytics' },
  { id: 'settings',  Icon: Settings,  label: 'Settings'  },
];

export default function AppShell({ activeTab, onTabChange, currency, onCurrencyChange, children }) {
  const [toast, setToast] = useState(null);

  function handleNav(id) {
    if (id === 'settings') {
      setToast('Settings — coming soon');
      setTimeout(() => setToast(null), 2200);
      return;
    }
    onTabChange?.(id);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ── Top logo bar ── */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="px-4 py-3 flex items-center justify-between">
          {/* Logo */}
          <Logo />

          {/* Currency selector */}
          <select
            value={currency}
            onChange={e => onCurrencyChange(e.target.value)}
            className="text-xs font-medium text-gray-600 border border-gray-200 rounded-lg px-2 py-1.5 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-200 cursor-pointer transition-colors"
          >
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* ── Desktop nav bar ── */}
        <div className="hidden sm:flex justify-center gap-1 bg-white border-t border-gray-50 px-4 py-1.5">
          {NAV_ITEMS.map(({ id, Icon, label }) => {
            const active = id === activeTab;
            return (
              <button
                key={id}
                onClick={() => handleNav(id)}
                className="relative flex flex-col items-center justify-center px-5 py-1.5 rounded-xl transition-colors hover:bg-gray-50"
                aria-label={label}
              >
                <Icon
                  size={16}
                  strokeWidth={active ? 2.5 : 2}
                  style={active ? { color: ACCENT } : undefined}
                  className={active ? '' : 'text-gray-400'}
                />
                <span
                  className="text-[10px] font-medium mt-0.5"
                  style={active ? { color: ACCENT } : undefined}
                  {...(!active && { className: 'text-[10px] font-medium mt-0.5 text-gray-400' })}
                >
                  {label}
                </span>
                {active && (
                  <span
                    className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                    style={{ backgroundColor: ACCENT }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Page content ── */}
      <div className="flex-1">
        {children}
      </div>

      {/* ── Mobile bottom bar ── */}
      <div
        className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 shadow-[0_-2px_12px_rgba(0,0,0,0.06)] flex items-center justify-around px-4 py-3"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
      >
        {NAV_ITEMS.map(({ id, Icon, label }) => {
          const active = id === activeTab;
          return (
            <button
              key={id}
              onClick={() => handleNav(id)}
              className="relative flex items-center justify-center w-12 h-10 rounded-xl transition-colors"
              aria-label={label}
            >
              <Icon
                size={22}
                strokeWidth={active ? 2.5 : 2}
                style={active ? { color: ACCENT } : undefined}
                className={active ? '' : 'text-gray-400'}
              />
              {active && (
                <span
                  className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                  style={{ backgroundColor: ACCENT }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Settings toast ── */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div className="bg-gray-900/90 text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg whitespace-nowrap">
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
