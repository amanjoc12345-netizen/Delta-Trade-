import React, { useState } from 'react';
import { TradingProvider } from './state/TradingContext.jsx';
import { useTrading } from './state/useTrading.js';
import { useMarketFeed } from './hooks/useMarketFeed.js';
import Header from './components/Header.jsx';
import AccountSummary from './components/AccountSummary.jsx';
import MarketWatchlist from './components/MarketWatchlist.jsx';
import CandlestickChart from './components/CandlestickChart.jsx';
import OrderPanel from './components/OrderPanel.jsx';
import BottomDock from './components/BottomDock.jsx';
import ToastContainer from './components/ToastContainer.jsx';
import { TrendingUp, Zap, ListFilter, Briefcase, ArrowUpRight, ArrowDownRight } from 'lucide-react';

import './styles/global.css';
import './styles/dashboard.css';
import './styles/components.css';

function DeltaTradeDashboard() {
  const { holdings, history, sellOrder } = useTrading();
  const {
    instruments,
    selectedInstrument,
    selectInstrument,
    selectedInterval,
    setSelectedInterval,
    connectionStatus,
    quotes,
    currentQuote,
    candles,
    isLoadingCandles,
    candleError,
    loadMoreHistory,
  } = useMarketFeed();

  // Mobile navigation tab state: 'chart' | 'trade' | 'watchlist' | 'positions'
  const [mobileTab, setMobileTab] = useState('chart');

  const handleClosePosition = (pos) => {
    if (!pos || !pos.quantity) return;
    const symQuote = quotes[pos.symbol] || (pos.symbol === selectedInstrument.id ? currentQuote : null);
    const executionPrice = symQuote ? (symQuote.bid || symQuote.price) : pos.avgEntryPrice;
    sellOrder({
      symbol: pos.symbol,
      quantity: pos.quantity,
      price: executionPrice,
    });
  };

  const openPositionsCount = Object.values(holdings || {}).filter(p => p && p.quantity > 0).length;

  return (
    <div className="deltatrade-app streetdesk-app">
      {/* Header with Navigation, Tickers, Theme toggle, and Fullscreen */}
      <Header
        connectionStatus={connectionStatus}
        instruments={instruments}
        selectedInstrument={selectedInstrument}
        onSelectInstrument={selectInstrument}
        quotes={quotes}
      />

      {/* Account Summary Strip */}
      <AccountSummary quotes={quotes} />

      {/* Main Trading Terminal Workspace */}
      <main className="dashboard-main">
        {/* Desktop / Tablet Grid (Responsive on > 768px) */}
        <div className="workspace-top-grid">
          {/* Left Column: Watchlist */}
          <div className={`workspace-col-watchlist ${mobileTab === 'watchlist' ? 'mobile-active' : ''}`}>
            <MarketWatchlist
              instruments={instruments}
              selectedInstrument={selectedInstrument}
              onSelectInstrument={(id) => {
                selectInstrument(id);
                // On mobile, switch to chart view on selection
                if (window.innerWidth <= 768) {
                  setMobileTab('chart');
                }
              }}
              quotes={quotes}
            />
          </div>

          {/* Center Column: TradingView Candlestick Chart */}
          <div className={`workspace-col-chart ${mobileTab === 'chart' ? 'mobile-active' : ''}`}>
            <CandlestickChart
              instrument={selectedInstrument}
              interval={selectedInterval}
              onSelectInterval={setSelectedInterval}
              candles={candles}
              isLoading={isLoadingCandles}
              error={candleError}
              quote={currentQuote}
              position={holdings[selectedInstrument.id]}
              onClosePosition={handleClosePosition}
              onLoadMoreHistory={loadMoreHistory}
            />

            {/* Quick Action Floating Bar for Mobile Chart View */}
            <div className="mobile-chart-quick-trade-bar">
              <button
                className="mobile-quick-btn buy"
                onClick={() => setMobileTab('trade')}
              >
                <ArrowUpRight size={14} />
                <span>Buy / Long {selectedInstrument.baseAsset}</span>
              </button>
              <button
                className="mobile-quick-btn sell"
                onClick={() => setMobileTab('trade')}
              >
                <ArrowDownRight size={14} />
                <span>Sell / Short {selectedInstrument.baseAsset}</span>
              </button>
            </div>
          </div>

          {/* Right Column: Order Entry Ticket */}
          <div className={`workspace-col-order ${mobileTab === 'trade' ? 'mobile-active' : ''}`}>
            <OrderPanel
              instrument={selectedInstrument}
              quote={currentQuote}
            />
          </div>
        </div>

        {/* Bottom Dock: Open Positions & Trade History */}
        <div className={`workspace-bottom-dock-wrapper ${mobileTab === 'positions' ? 'mobile-active' : ''}`}>
          <BottomDock
            holdings={holdings}
            history={history}
            quotes={quotes}
            onSelectInstrument={(id) => {
              selectInstrument(id);
              if (window.innerWidth <= 768) {
                setMobileTab('chart');
              }
            }}
            onClosePosition={handleClosePosition}
          />
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar (Visible only on <= 768px) */}
      <nav className="mobile-nav-bar" aria-label="Mobile Navigation">
        <button
          className={`mobile-nav-item ${mobileTab === 'chart' ? 'active' : ''}`}
          onClick={() => setMobileTab('chart')}
          aria-label="Chart view"
        >
          <TrendingUp size={18} />
          <span>Chart</span>
        </button>

        <button
          className={`mobile-nav-item ${mobileTab === 'trade' ? 'active' : ''}`}
          onClick={() => setMobileTab('trade')}
          aria-label="Trade order panel"
        >
          <Zap size={18} />
          <span>Trade</span>
        </button>

        <button
          className={`mobile-nav-item ${mobileTab === 'watchlist' ? 'active' : ''}`}
          onClick={() => setMobileTab('watchlist')}
          aria-label="Market watchlist"
        >
          <ListFilter size={18} />
          <span>Markets</span>
        </button>

        <button
          className={`mobile-nav-item ${mobileTab === 'positions' ? 'active' : ''}`}
          onClick={() => setMobileTab('positions')}
          aria-label="Positions and history"
        >
          <Briefcase size={18} />
          <span>Portfolio</span>
          {openPositionsCount > 0 && (
            <span className="mobile-nav-badge">{openPositionsCount}</span>
          )}
        </button>
      </nav>

      {/* Toast Notifications */}
      <ToastContainer />
    </div>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Terminal Crash caught by ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          backgroundColor: '#0a0d14',
          color: '#e2e8f0',
          fontFamily: "'Inter', sans-serif",
          padding: '24px',
          textAlign: 'center',
        }}>
          <h2 style={{ color: '#ef4444', marginBottom: '12px' }}>Delta Trade Terminal Recovered</h2>
          <p style={{ maxWidth: '480px', color: '#94a3b8', marginBottom: '20px', fontSize: '14px' }}>
            A temporary rendering glitch was safely captured. Click below to reload the real-time workstation.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reload Delta Trade
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <TradingProvider>
        <DeltaTradeDashboard />
      </TradingProvider>
    </ErrorBoundary>
  );
}
