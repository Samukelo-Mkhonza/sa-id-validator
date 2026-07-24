import React from 'react';
import './App.css';
import IDValidator from './components/IDValidator';
import HomeAffairsLogo from './images/home-affairs-logo.png';

function App() {
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
        <IDValidator />
      </main>

      <footer className="page__footer">
        <p className="page__footer-text">
          This tool checks the structure and Luhn checksum of a South African ID
          number and decodes the details it encodes. It does not verify identity
          against any government database.
        </p>
        <p className="page__footer-meta">Built by Samukelo Mkhonza</p>
      </footer>
    </div>
  );
}

export default App;
