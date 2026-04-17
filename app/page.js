'use client';

import { useState, useEffect } from 'react';
import HomeScreen       from '../components/HomeScreen';
import PortfolioWizard  from '../components/PortfolioWizard';
import PortfolioTracker from '../components/PortfolioTracker';
import AnalyticsTab     from '../components/AnalyticsTab';
import { getPortfolios, savePortfolio, deletePortfolio } from '../lib/storage';

export default function App() {
  const [screen,     setScreen]     = useState('home');
  const [portfolios, setPortfolios] = useState([]);
  const [active,     setActive]     = useState(null);
  const [editing,    setEditing]    = useState(null);

  useEffect(() => { setPortfolios(getPortfolios()); }, []);

  function refreshList() { setPortfolios(getPortfolios()); }

  function handleTabChange(tab) {
    if (tab === 'home')      { setScreen('home'); refreshList(); }
    if (tab === 'analytics') { setScreen('analytics'); }
  }

  function handleOpen(portfolio)  { setActive(portfolio); setScreen('tracker'); }
  function handleCreate()         { setEditing(null); setScreen('wizard'); }
  function handleEdit(portfolio)  { setEditing(portfolio); setScreen('wizard'); }

  function handleWizardComplete(portfolio) { refreshList(); setActive(portfolio); setScreen('tracker'); }
  function handleWizardCancel()            { setScreen('home'); refreshList(); }

  function handleTrackerUpdate(updated) { setActive(updated); savePortfolio(updated); refreshList(); }
  function handleDelete(id)             { deletePortfolio(id); refreshList(); }
  function handleBack()                 { setScreen('home'); refreshList(); }

  if (screen === 'analytics') return <AnalyticsTab onTabChange={handleTabChange} />;

  if (screen === 'wizard') return (
    <PortfolioWizard mode={editing ? 'edit' : 'create'} portfolio={editing}
      onComplete={handleWizardComplete} onCancel={handleWizardCancel} />
  );

  if (screen === 'tracker' && active) return (
    <PortfolioTracker portfolio={active} onBack={handleBack} onUpdate={handleTrackerUpdate} />
  );

  return (
    <HomeScreen portfolios={portfolios} onOpen={handleOpen} onCreate={handleCreate}
      onEdit={handleEdit} onDelete={handleDelete}
      onTabChange={handleTabChange} activeTab="home" />
  );
}
