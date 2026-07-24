import React, { useState } from 'react';
import './App.css';
import IDValidator from './components/IDValidator';
import BulkValidator from './components/BulkValidator';
import HomeAffairsLogo from './images/home-affairs-logo.png';

function App() {
  const [mode, setMode] = useState('single');

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
        <div className={`stack ${mode === 'bulk' ? 'stack--wide' : ''}`}>
          <div className="tabs" role="tablist" aria-label="Validation mode">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'single'}
              className={`tab ${mode === 'single' ? 'tab--active' : ''}`}
              onClick={() => setMode('single')}
            >
              Single ID
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'bulk'}
              className={`tab ${mode === 'bulk' ? 'tab--active' : ''}`}
              onClick={() => setMode('bulk')}
            >
              Bulk / batch
            </button>
          </div>

          {mode === 'single' ? <IDValidator /> : <BulkValidator />}
        </div>
      </main>

      <footer className="page__footer">
        <p className="page__footer-text">
          This tool checks the structure and Luhn checksum of a South African ID
          number and decodes the details it encodes. It does <strong>not</strong> verify
          identity against any government database — a well-formed number is not
          proof that the ID exists or belongs to anyone.
        </p>
        <p className="page__footer-meta">Built by Samukelo Mkhonza</p>
      </footer>
    </div>
  );
}

export default App;
