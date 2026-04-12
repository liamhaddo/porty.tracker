'use client';

import { useState } from 'react';
import { Home, BarChart2, Settings, Plus } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'home',     Icon: Home,     label: 'Home',      active: true  },
  { id: 'charts',   Icon: BarChart2, label: 'Analytics', active: false },
  { id: 'settings', Icon: Settings, label: 'Settings',  active: false },
];

export default function Taskbar({ themeColour = '#6366f1', onAdd }) {
  const [toast, setToast] = useState(null);

  function showToast(label) {
    setToast(`${label} — coming soon`);
    setTimeout(() => setToast(null), 2200);
  }

  return (
    <>
      {/* ── Desktop taskbar (in content flow, hidden on mobile) ── */}
      <div className="hidden sm:flex items-center justify-between bg-white rounded-2xl shadow-sm px-3 py-1.5">
        {/* Nav icons */}
        <div className="flex items-center gap-0.5">
          {NAV_ITEMS.map(({ id, Icon, label, active }) => (
            <button
              key={id}
              onClick={active ? undefined : () => showToast(label)}
              className="relative flex items-center justify-center w-9 h-9 rounded-xl transition-colors hover:bg-gray-50"
              aria-label={label}
            >
              <Icon
                size={17}
                strokeWidth={active ? 2.5 : 2}
                style={active ? { color: themeColour } : undefined}
                className={active ? '' : 'text-gray-400 hover:text-gray-600'}
              />
              {active && (
                <span
                  className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                  style={{ backgroundColor: themeColour }}
                />
              )}
            </button>
          ))}
        </div>

        {/* + Add button */}
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 text-xs font-semibold text-white rounded-xl px-3.5 py-2 transition-opacity hover:opacity-90 active:opacity-80"
          style={{ backgroundColor: themeColour }}
        >
          <Plus size={13} strokeWidth={2.5} />
          Add
        </button>
      </div>

      {/* ── Mobile bottom bar (fixed, only on mobile) ── */}
      <div
        className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 shadow-[0_-2px_16px_rgba(0,0,0,0.07)] rounded-t-2xl flex items-center justify-between px-4 pt-2.5"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 10px)' }}
      >
        {/* Nav icons */}
        <div className="flex items-center gap-1">
          {NAV_ITEMS.map(({ id, Icon, label, active }) => (
            <button
              key={id}
              onClick={active ? undefined : () => showToast(label)}
              className="relative flex flex-col items-center justify-center w-11 h-11 rounded-xl transition-colors"
              aria-label={label}
            >
              <Icon
                size={20}
                strokeWidth={active ? 2.5 : 2}
                style={active ? { color: themeColour } : undefined}
                className={active ? '' : 'text-gray-400'}
              />
              {active && (
                <span
                  className="mt-1 w-1 h-1 rounded-full"
                  style={{ backgroundColor: themeColour }}
                />
              )}
            </button>
          ))}
        </div>

        {/* + Add button */}
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 text-xs font-semibold text-white rounded-xl px-4 py-2.5 transition-opacity active:opacity-80"
          style={{ backgroundColor: themeColour }}
        >
          <Plus size={14} strokeWidth={2.5} />
          Add
        </button>
      </div>

      {/* ── Coming soon toast ── */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div className="bg-gray-900/90 text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg whitespace-nowrap">
            {toast}
          </div>
        </div>
      )}
    </>
  );
}
