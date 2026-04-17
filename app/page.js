'use client';

import { useState, useEffect } from 'react';
import AppShell        from '../components/AppShell';
import PortfolioTab    from '../components/PortfolioTab';
import AnalyticsTab    from '../components/AnalyticsTab';
import PortfolioWizard from '../components/PortfolioWizard';
import { getPortfolios, savePortfolio, deletePortfolio } from '../lib/storage';

export default function App() {
  const [activeTab,       setActiveTab]       = useState('portfolio');
  const [portfolios,      setPortfolios]      = useState([]);
  const [activePortfolio, setActivePortfolio] = useState(null);
  const [wizardMode,      setWizardMode]      = useState(null);
  const [editing,         setEditing]         = useState(null);
  const [currency,        setCurrency]        = useState('USD');

  useEffect(() => {
    const list = getPortfolios();
    setPortfolios(list);
    if (list.length > 0) setActivePortfolio(list[0]);
  }, []);

  function refreshList() {
    const list = getPortfolios();
    setPortfolios(list);
    return list;
  }

  function handleDelete(id) {
    deletePortfolio(id);
    const list = refreshList();
    if (activePortfolio?.id === id) {
      setActivePortfolio(list.length > 0 ? list[0] : null);
    }
  }

  function handleWizardComplete(portfolio) {
    refreshList();
    setActivePortfolio(portfolio);
    setWizardMode(null);
    setEditing(null);
  }

  function handleUpdate(updated) {
    savePortfolio(updated);
    setActivePortfolio(updated);
    refreshList();
  }

  if (wizardMode) {
    return (
      <PortfolioWizard
        mode={wizardMode}
        portfolio={editing}
        onComplete={handleWizardComplete}
        onCancel={() => { setWizardMode(null); setEditing(null); }}
      />
    );
  }

  return (
    <AppShell
      activeTab={activeTab}
      onTabChange={setActiveTab}
      currency={currency}
      onCurrencyChange={setCurrency}
    >
      {activeTab === 'portfolio' && (
        <PortfolioTab
          portfolios={portfolios}
          activePortfolio={activePortfolio}
          onSelectPortfolio={setActivePortfolio}
          onCreate={() => { setEditing(null); setWizardMode('create'); }}
          onEdit={(p) => { setEditing(p); setWizardMode('edit'); }}
          onDelete={handleDelete}
          onUpdate={handleUpdate}
          currency={currency}
        />
      )}
      {activeTab === 'analytics' && (
        <AnalyticsTab onTabChange={setActiveTab} />
      )}
      {activeTab === 'settings' && (
        <div className="flex items-center justify-center pt-32">
          <p className="text-sm text-gray-400">Settings — coming soon</p>
        </div>
      )}
    </AppShell>
  );
}
