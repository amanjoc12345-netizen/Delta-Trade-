import React from 'react';
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
  } = useMarketFeed();

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
        <div className="workspace-top-grid">
          {/* Left Column: Watchlist */}
          <MarketWatchlist
            instruments={instruments}
            selectedInstrument={selectedInstrument}
            onSelectInstrument={selectInstrument}
            quotes={quotes}
          />

          {/* Center Column: TradingView Candlestick Chart */}
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
          />

          {/* Right Column: Order Entry Ticket */}
          <OrderPanel
            instrument={selectedInstrument}
            quote={currentQuote}
          />
        </div>

        {/* Bottom Dock: Open Positions & Trade History */}
        <BottomDock
          holdings={holdings}
          history={history}
          quotes={quotes}
          onSelectInstrument={selectInstrument}
          onClosePosition={handleClosePosition}
        />
      </main>

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

  componentDidCatch(error, info) {
    console.error('Trading Terminal ErrorBoundary caught:', error, info);
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
          background: '#0b0f19',
          color: '#f8fafc',
          fontFamily: 'Inter, sans-serif',
          textAlign: 'center',
          padding: '20px',
        }}>
          <h2 style={{ fontSize: '20px', marginBottom: '8px', color: '#ef4444' }}>Terminal Encountered An Issue</h2>
          <p style={{ color: '#94a3b8', maxWidth: '450px', fontSize: '13px', marginBottom: '16px' }}>
            {this.state.error?.message || 'An unexpected rendering error occurred.'}
          </p>
          <button
            onClick={() => { localStorage.clear(); window.location.reload(); }}
            style={{
              padding: '8px 16px',
              background: '#3b82f6',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '12px',
            }}
          >
            Reset Cache & Reload Terminal
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
