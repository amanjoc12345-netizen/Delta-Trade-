import React, { useState, useEffect } from 'react';
import { 
  RotateCcw, 
  Maximize2, 
  Minimize2, 
  Sun, 
  Moon, 
  AlertTriangle 
} from 'lucide-react';
import { useTrading } from '../state/useTrading.js';

export default function Header({
  connectionStatus,
  instruments,
  selectedInstrument,
  onSelectInstrument,
  quotes,
}) {
  const { resetAccount } = useTrading();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('deltatrade_theme') || localStorage.getItem('streetdesk_theme') || 'light');

  // Sync theme attribute to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('deltatrade_theme', theme);
  }, [theme]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const isConnected = connectionStatus === 'connected';

  return (
    <header className="app-header" role="banner">
      {/* Brand & Market Strip */}
      <div className="header-left-cluster">
        <div className="header-brand" aria-label="Delta Trade Terminal">
          <div className="delta-brand-logo" aria-hidden="true">
            <svg className="delta-logo-svg" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="hdrDeltaGrad" x1="2" y1="38" x2="38" y2="2" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#00d2ff" />
                  <stop offset="0.5" stopColor="#3a7bd5" />
                  <stop offset="1" stopColor="#6366f1" />
                </linearGradient>
                <linearGradient id="hdrCoreGrad" x1="12" y1="30" x2="28" y2="14" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#00f2fe" />
                  <stop offset="1" stopColor="#4facfe" />
                </linearGradient>
              </defs>
              <path d="M20 4L37 35H3L20 4Z" stroke="url(#hdrDeltaGrad)" strokeWidth="3.2" strokeLinejoin="round" />
              <path d="M20 14L29 30H11L20 14Z" fill="url(#hdrCoreGrad)" opacity="0.9" />
              <path d="M16 25L24 25" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <span className="brand-title">Delta Trade</span>
          <span className="brand-badge">PRO TERMINAL</span>
        </div>

        {/* Quick Instrument Strip across header */}
        <div className="header-quick-tickers" role="tablist" aria-label="Quick instrument switcher">
          {(instruments || []).slice(0, 4).map((inst) => {
            const isSelected = selectedInstrument?.id === inst.id;
            const q = quotes?.[inst.id];
            const isPos = q ? q.change24h >= 0 : true;

            return (
              <button
                key={inst.id}
                className={`quick-ticker-pill ${isSelected ? 'active' : ''}`}
                onClick={() => onSelectInstrument(inst.id)}
                role="tab"
                aria-selected={isSelected}
              >
                <span className="q-symbol">{inst.symbol}</span>
                {q && (
                  <span className={`q-change font-mono ${isPos ? 'pos' : 'neg'}`}>
                    {isPos ? '+' : ''}{q.change24h?.toFixed(2)}%
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Header Right Actions */}
      <div className="header-actions">
        {/* Live Market Data Status Pill */}
        <div
          className={`status-pill ${isConnected ? 'connected' : 'connecting'}`}
          title="Direct live public market stream from Binance"
        >
          <span className="status-indicator-dot"></span>
          <span className="status-label-text">
            {isConnected ? 'Live Market Data' : 'Connecting...'}
          </span>
        </div>

        {/* Full Screen Mode Toggle Button */}
        <button
          className="header-icon-btn"
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit Full Screen' : 'Enter Full Screen'}
          aria-label={isFullscreen ? 'Exit Full Screen' : 'Enter Full Screen'}
          id="fullscreen-toggle-btn"
        >
          {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>

        {/* Theme Toggle (Light / Dark) */}
        <button
          className="header-icon-btn"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          aria-label="Toggle Theme Mode"
          id="theme-toggle-btn"
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </button>

        {/* Reset Demo Account */}
        <div className="account-indicator-group">
          <button
            className="reset-demo-btn"
            onClick={() => setShowResetConfirm(true)}
            title="Reset demo cash to 10,000 USDT and clear trade history"
            aria-label="Reset demo account"
          >
            <RotateCcw size={13} />
            <span className="btn-text">Reset Demo ($10k)</span>
          </button>
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      {showResetConfirm && (
        <div className="dialog-backdrop" role="dialog" aria-modal="true" aria-labelledby="reset-dialog-title">
          <div className="dialog-card">
            <div className="dialog-header">
              <AlertTriangle size={20} className="dialog-warn-icon" />
              <h3 id="reset-dialog-title" className="dialog-title">Reset Demo Account</h3>
            </div>
            <p className="dialog-desc">
              This will restore your starting cash to <strong>10,000 USDT</strong> and clear all your current holdings and trade history.
            </p>
            <div className="dialog-actions">
              <button
                className="dialog-btn secondary"
                onClick={() => setShowResetConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="dialog-btn danger"
                onClick={() => {
                  resetAccount();
                  setShowResetConfirm(false);
                }}
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
