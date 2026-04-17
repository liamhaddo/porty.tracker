'use client';

import { useState } from 'react';
import { Home, BarChart2, Settings, Plus } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'home',      Icon: Home,     label: 'Home'      },
  { id: 'analytics', Icon: BarChart2, label: 'Analytics' },
  { id: 'settings',  Icon: Settings, label: 'Settings'  },
];

export default function Taskbar({ themeColour = '#6366f1', onAdd, activeTab = 'home', onTabChange }) {
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
    <>
      {/* ── Desktop taskbar (in content flow, hidden on mobile) ── */}
      <div className="hidden sm:flex items-center justify-between bg-white rounded-2xl shadow-sm px-3 py-1.5">
        {/* Nav icons */}
        <div className="flex items-center gap-0.5">
          {NAV_ITEMS.map(({ id, Icon, label }) => {
            const active = id === activeTab;
            return (
              <button
                key={id}
                onClick={() => handleNav(id)}
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
            );
          })}
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

      {/* ── Mobile bottom bar (fixed, full-width, only on mobile) ── */}
      <div
        className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 shadow-[0_-2px_12px_rgba(0,0,0,0.06)] flex items-center px-4 py-3"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)' }}
      >
        {/* Nav icons — evenly spaced across the left, take remaining space */}
        <div className="flex-1 flex items-center justify-around">
          {NAV_ITEMS.map(({ id, Icon, label }) => {
            const active = id === activeTab;
            return (
              <button
                key={id}
                onClick={() => handleNav(id)}
                className="relative flex flex-col items-center justify-center w-12 h-10 rounded-xl transition-colors"
                aria-label={label}
              >
                <Icon
                  size={22}
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
            );
          })}
        </div>

        {/* + Add button — fixed to the far right */}
        <button
          onClick={onAdd}
          className="ml-4 flex items-center gap-1.5 text-xs font-semibold text-white rounded-xl px-4 py-2.5 transition-opacity active:opacity-80"
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
