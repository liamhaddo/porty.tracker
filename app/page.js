'use client';

import { useState, useEffect } from 'react';
import HomeScreen       from '../components/HomeScreen';
import PortfolioWizard  from '../components/PortfolioWizard';
import PortfolioTracker from '../components/PortfolioTracker';
import { getPortfolios, savePortfolio, deletePortfolio } from '../lib/storage';

// screen: 'home' | 'tracker' | 'wizard'

export default function App() {
  const [screen,    setScreen]    = useState('home');
  const [portfolios, setPortfolios] = useState([]);
  const [active,    setActive]    = useState(null);  // currently open portfolio
  const [editing,   setEditing]   = useState(null);  // portfolio being edited

  // Load from localStorage on first render (client-only)
  useEffect(() => {
    setPortfolios(getPortfolios());
  }, []);

  function refreshList() {
    setPortfolios(getPortfolios());
  }

  // ── Home screen actions ───────────────────────────────────────────────────

  function handleOpen(portfolio) {
    setActive(portfolio);
    setScreen('tracker');
  }

  function handleCreate() {
    setEditing(null);
    setScreen('wizard');
  }

  function handleEdit(portfolio) {
    setEditing(portfolio);
    setScreen('wizard');
  }

  // ── Wizard callbacks ──────────────────────────────────────────────────────

  function handleWizardComplete(portfolio) {
    refreshList();
    setActive(portfolio);
    setScreen('tracker');
  }

  function handleWizardCancel() {
    setScreen('home');
    refreshList();
  }

  // ── Tracker callbacks ─────────────────────────────────────────────────────

  function handleTrackerUpdate(updated) {
    setActive(updated);
    savePortfolio(updated);
    refreshList();
  }

  function handleDelete(id) {
    deletePortfolio(id);
    refreshList();
  }

  function handleBack() {
    setScreen('home');
    refreshList();
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (screen === 'wizard') {
    return (
      <PortfolioWizard
        mode={editing ? 'edit' : 'create'}
        portfolio={editing}
        onComplete={handleWizardComplete}
        onCancel={handleWizardCancel}
      />
    );
  }

  if (screen === 'tracker' && active) {
    return (
      <PortfolioTracker
        portfolio={active}
        onBack={handleBack}
        onUpdate={handleTrackerUpdate}
      />
    );
  }

  return (
    <HomeScreen
      portfolios={portfolios}
      onOpen={handleOpen}
      onCreate={handleCreate}
      onEdit={handleEdit}
      onDelete={handleDelete}
    />
  );
}
