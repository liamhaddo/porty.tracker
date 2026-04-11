'use client';

import Logo from './Logo';

export default function HomeScreen({ portfolios, onOpen, onCreate, onEdit }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center px-4 py-16">
      {/* Logo */}
      <div className="mb-12 text-center">
        <Logo />
      </div>

      {/* Portfolio list */}
      <div className="w-full max-w-lg space-y-3">
        {portfolios.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-400 text-sm mb-8">No portfolios yet. Create one to get started.</p>
          </div>
        ) : (
          portfolios.map(p => (
            <PortfolioCard
              key={p.id}
              portfolio={p}
              onOpen={() => onOpen(p)}
              onEdit={() => onEdit(p)}
            />
          ))
        )}

        {/* Create button */}
        <button
          onClick={onCreate}
          className="w-full py-3.5 rounded-2xl border-2 border-dashed border-gray-200 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700 hover:bg-white transition-colors mt-2"
        >
          + Create New Portfolio
        </button>
      </div>
    </div>
  );
}

function PortfolioCard({ portfolio, onOpen, onEdit }) {
  const count = portfolio.holdings?.length ?? 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden flex">
      {/* Colour accent strip */}
      <div className="w-1.5 shrink-0" style={{ backgroundColor: portfolio.themeColour }} />

      <div className="flex-1 flex items-center justify-between px-5 py-4 gap-4">
        <div className="min-w-0">
          <p className="text-base font-semibold text-gray-900 truncate">{portfolio.name}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {count === 0 ? 'No holdings' : `${count} holding${count !== 1 ? 's' : ''}`}
          </p>
        </div>

        <div className="flex gap-2 shrink-0">
          <button
            onClick={onEdit}
            className="text-xs font-medium text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors"
          >
            Edit
          </button>
          <button
            onClick={onOpen}
            className="text-xs font-medium text-white rounded-lg px-3 py-1.5 transition-colors"
            style={{ backgroundColor: portfolio.themeColour }}
          >
            Open
          </button>
        </div>
      </div>
    </div>
  );
}
