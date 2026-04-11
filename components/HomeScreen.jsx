'use client';

import { useState, useRef, useEffect } from 'react';
import Logo from './Logo';

export default function HomeScreen({ portfolios, onOpen, onCreate, onEdit, onDelete }) {
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
              onDelete={() => onDelete(p.id)}
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

function PortfolioCard({ portfolio, onOpen, onEdit, onDelete }) {
  const count = portfolio.holdings?.length ?? 0;
  const [menuOpen, setMenuOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const menuRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  return (
    <>
      <div
        className="bg-white rounded-2xl shadow-sm flex cursor-pointer hover:shadow-md transition-shadow"
        onClick={onOpen}
      >
        {/* Colour accent strip */}
        <div className="w-1.5 shrink-0 rounded-l-2xl" style={{ backgroundColor: portfolio.themeColour }} />

        <div className="flex-1 flex items-center justify-between px-5 py-4 gap-4">
          <div className="min-w-0">
            <p className="text-base font-semibold text-gray-900 truncate">{portfolio.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {count === 0 ? 'No holdings' : `${count} holding${count !== 1 ? 's' : ''}`}
            </p>
          </div>

          {/* Three-dot menu */}
          <div className="relative shrink-0" ref={menuRef}>
            <button
              onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Portfolio options"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="8" cy="2.5" r="1.5" />
                <circle cx="8" cy="8" r="1.5" />
                <circle cx="8" cy="13.5" r="1.5" />
              </svg>
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-gray-100 rounded-xl shadow-lg z-50 py-1">
                <button
                  onClick={e => { e.stopPropagation(); setMenuOpen(false); onEdit(); }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={e => { e.stopPropagation(); setMenuOpen(false); setShowDeleteConfirm(true); }}
                  className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-gray-900 mb-1">Delete portfolio?</h3>
            <p className="text-sm text-gray-500 mb-5">
              "{portfolio.name}" will be permanently deleted. This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowDeleteConfirm(false); onDelete(); }}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
