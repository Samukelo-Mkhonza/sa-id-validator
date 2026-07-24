import React, { useState } from 'react';
import './App.css';
import IDValidator from './components/IDValidator';
import BulkValidator from './components/BulkValidator';
import ReconcileValidator from './components/ReconcileValidator';
import HomeAffairsLogo from './images/home-affairs-logo.png';
import { I18nProvider, useI18n, LANGS } from './i18n';

function AppShell() {
  const { t, lang, setLang } = useI18n();
  const [mode, setMode] = useState('single');
  const wide = mode !== 'single';

  const tabs = [
    { id: 'single', label: t('tabSingle') },
    { id: 'bulk', label: t('tabBulk') },
    { id: 'reconcile', label: t('tabReconcile') },
  ];

  return (
    <div className="page">
      <div className="page__accent" />

      <img
        src={HomeAffairsLogo}
        alt=""
        aria-hidden="true"
        className="page__watermark"
      />

      <main className="page__main">
        <div className={`stack ${wide ? 'stack--wide' : ''}`}>
          <div className="stack__header">
            <label className="langswitch">
              <span className="langswitch__label">{t('langLabel')}</span>
              <select
                className="langswitch__select"
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                aria-label={t('langLabel')}
              >
                {LANGS.map((l) => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="tabs" role="tablist" aria-label="Validation mode">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={mode === tab.id}
                className={`tab ${mode === tab.id ? 'tab--active' : ''}`}
                onClick={() => setMode(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {mode === 'single' && <IDValidator />}
          {mode === 'bulk' && <BulkValidator />}
          {mode === 'reconcile' && <ReconcileValidator />}
        </div>
      </main>

      <footer className="page__footer">
        <p className="page__footer-text">{t('footer')}</p>
        <p className="page__footer-meta">Built by Samukelo Mkhonza</p>
      </footer>
    </div>
  );
}

function App() {
  return (
    <I18nProvider>
      <AppShell />
    </I18nProvider>
  );
}

export default App;
