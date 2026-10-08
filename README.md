# Delta Trade — Institutional Real-Time Trading Platform

**CapitalStreetFX Frontend Developer Evaluation Assignment**  
Built with **React 19**, **JavaScript (ES Modules)**, **Vite**, **Vanilla CSS**, **TradingView Lightweight Charts v5**, **Lucide React**, and tested with **Vitest**.

---

## 1. Overview & Architecture

**Delta Trade** is an institutional-grade crypto trading terminal designed for professional traders. It delivers high information density, crisp typography (`JetBrains Mono`), real-time live market data from Binance public streams, full-screen canvas candlestick charting, unified demo cash sizing, and two-way trading (Long & Short).

### Key Architectural Strengths
- **Live Market Feed:** Real-time spot quotes, bid/ask spreads, and candlestick bars directly connected to Binance's public WebSocket and REST infrastructure (`https://data-api.binance.vision`).
- **Unified Demo Cash for Buy & Sell:** Available demo cash ($10,000 USDT) serves as the unified balance for both Long (Buy) and Short (Sell) trades. Quick sizing percentages (25%, 50%, 75%, 100%) calculate order sizes from available cash on both sides.
- **Pure Financial Logic Engine:** Fully isolated accounting and validation modules (`accounting.js`, `validation.js`) with zero UI dependencies, covered by 20 automated unit tests.
- **Strict Separation of Concerns:**
  - `src/components/`: Pure presentation components with semantic HTML and accessibility attributes.
  - `src/hooks/`: Reactive stream subscriptions and data feeds (`useMarketFeed.js`).
  - `src/services/`: External API and WebSocket network layer with automatic reconnection (`binanceProvider.js`).
  - `src/state/`: Predictable state machine (`TradingContext.jsx`, `tradingReducer.js`, `useTrading.js`).
  - `src/utils/`: Deterministic math, financial accounting, input validation, number formatting, and local persistence.

---

## 2. Technical Quality Standards (Compliance Checklist)

| Criterion | Implementation in Delta Trade |
| :--- | :--- |
| **Sensible Component Structure & Naming** | Clean 1-to-1 mapped component files in `src/components/` (`Header`, `AccountSummary`, `MarketWatchlist`, `CandlestickChart`, `OrderPanel`, `BottomDock`, `PositionsTable`, `TradeHistory`, `ConfirmOrderDialog`, `ToastContainer`). Zero dead or duplicate files. |
| **Separation of Business Logic** | All financial accounting (weighted entry prices, floating P&L, equity, realized P&L, float rounding) is isolated in `src/utils/accounting.js`. Order rules and input sanitization live in `src/utils/validation.js`. |
| **Avoid Unnecessary Duplication** | Reusable formatting utilities (`formatting.js`), single source of truth for instrument definitions (`instruments.js`), centralized trade state management. |
| **Appropriate State Management** | React Context + `useReducer` for portfolio state (`cash`, `holdings`, `history`) with automatic localStorage persistence. Local component state reserved for transient UI (active tab, dialogs, form input). |
| **Clean Console & Zero Linter Warnings** | 0 errors and 0 warnings under `oxlint` across all files. Proper React effect cleanups, unmount safety, and event listener teardowns. |
| **Semantic HTML & Accessible Controls** | Proper semantic tags (`<header>`, `<main>`, `<aside>`, `<section>`, `<table>`, `<form>`), ARIA tabs (`role="tablist"`, `role="tab"`, `role="tabpanel"`), form associations (`<label htmlFor="...">`), dialog focus trapping and escape handling. |
| **Robust Edge Case Handling** | Covers zero/negative quantities, precision overflow, stale market quotes, insufficient cash, floating-point rounding errors (`FLOAT_TOLERANCE`), network disconnections, and empty list states. |
| **Developer Ergonomics** | Single command to install and run, deterministic tests, standard Vite configuration, and complete documentation. |

---

## 3. Tech Stack

- **Framework:** React 19 (`^19.2.8`) using functional components and hooks (`useState`, `useReducer`, `useEffect`, `useRef`, `useCallback`, `useMemo`).
- **Language:** JavaScript (Modern ES Modules — pure vanilla JavaScript, no TypeScript).
- **Build Tool:** Vite 8.
- **Styling:** Vanilla CSS with scoped design tokens (`tokens.css`, `global.css`, `dashboard.css`, `components.css`). No Tailwind, Bootstrap, or component libraries.
- **Charting Engine:** Official TradingView `lightweight-charts` v5.
- **Icons:** `lucide-react`.
- **Testing:** `vitest` for automated unit tests.
- **Linter:** `oxlint` (configured and verified clean).

---

## 4. Getting Started

### Prerequisites
- Node.js 18+ (tested on Node.js 20 & 24)
- npm 9+

### Installation & Development
```bash
# 1. Install dependencies
npm install

# 2. Start local development server
npm run dev

# 3. Open browser at http://localhost:5173/
```

### Run Tests
```bash
# Run Vitest unit tests (20 tests covering accounting & validation)
npm test
```

### Run Linter
```bash
# Check code hygiene with oxlint (0 warnings, 0 errors)
npm run lint
```

### Production Build
```bash
# Build optimized production bundle
npm run build

# Preview production build locally
npm run preview
```

---

## 5. Market Data & Real-Time Feed

Delta Trade supports 5 core cryptocurrency pairs:
- **BTC/USDT** (Bitcoin)
- **ETH/USDT** (Ethereum)
- **SOL/USDT** (Solana)
- **XRP/USDT** (XRP)
- **DOGE/USDT** (Dogecoin)

### Live Data Architecture (`src/services/binanceProvider.js`)
- **Direct Public API Access:** Zero API keys required from the user. Uses Binance's public REST and WebSocket feeds (`https://data-api.binance.vision`).
- **Historical Candlesticks:** REST endpoint fetches historical OHLCV bars aligned to selected timeframe (`1m`, `5m`, `15m`, `1h`).
- **24-Hour Tickers:** Initial REST batch populates 24h change %, high, low, and volume for all 5 pairs.
- **Live Streaming WebSocket:** Subscribes to combined streams for real-time kline updates (`@kline_<timeframe>`) and bid/ask quotes (`@bookTicker`).
- **Resilient Connection:** Automatic bounded exponential backoff reconnection (1s, 2s, 4s, 8s, up to 10s max) if connection drops.

---

## 6. Accounting & Execution Rules

The trading terminal executes orders in accordance with professional trading desk mechanics (`src/utils/accounting.js`):

1. **Initial Demo Balance:** $10,000.00 USDT.
2. **Buy Orders (Long):**
   - Execute at current **Ask** quote.
   - Deducts trade value (`quantity * ask`) from available cash.
   - Computes weighted-average entry price on multiple buys:
     $$\text{AvgPrice}_{\text{new}} = \frac{(\text{Qty}_{\text{prev}} \times \text{AvgPrice}_{\text{prev}}) + (\text{Qty}_{\text{add}} \times \text{Price})}{\text{Qty}_{\text{new}}}$$
3. **Sell Orders (Short / Close):**
   - Execute at current **Bid** quote.
   - If user holds an existing Long position, sells close/reduce it, calculating Realized P&L:
     $$\text{Realized P&L} = \text{Qty} \times (\text{Bid} - \text{AvgPrice})$$
   - If user has no holding or opens a Short, available demo cash allocates the position.
   - Short positions generate profit when price falls:
     $$\text{Unrealized P&L (Short)} = \text{Qty} \times (\text{AvgPrice} - \text{Ask})$$
   - Buying back to close a Short returns initial allocated cash plus realized profit or loss.
4. **Mark-to-Market Portfolio Valuation:**
   - Real-time mark-to-market updates for each holding based on live bid/ask quotes.
   - Account Equity:
     $$\text{Equity} = \text{Cash} + \sum \text{Market Value of Holdings}$$
5. **Floating-Point Precision:** Floating-point rounding errors handled using `FLOAT_TOLERANCE = 1e-8` and explicit decimal rounding to eliminate dust balances.
6. **Persistence:** Complete portfolio state (`cash`, `holdings`, `history`) is saved to `localStorage` under `DELTATRADE_STATE_V1` and can be restored or reset to $10,000 USDT anytime.

---

## 7. Edge Cases Handled

- **Invalid Order Quantities:** Rejects zero, negative, `NaN`, non-numeric, values below `minQty`, values above `maxQty`, and values exceeding instrument decimal precision.
- **Insufficient Balance:** Rejects orders exceeding available cash on both Buy and Sell sides with clear inline error messaging.
- **Quote Staleness & Unavailability:** Checks quote freshness (< 15 seconds) and disables order confirmation if live quotes are unavailable.
- **Instrument Switching Safety:** Chart clears instantly upon instrument change to prevent mixing bars from different assets while waiting for new data.
- **Empty States:** Beautiful empty states with descriptive instructions for empty positions table and empty trade history.
- **Responsive Layout:** Adaptive desktop grid layout gracefully collapsing to mobile/tablet single-column layout with scrolling docks.

---

## 8. Test Coverage

The test suite runs with Vitest:
```bash
npm test
```

### Covered Test Suites:
- `src/utils/accounting.test.js`:
  - Buying updates cash and holdings correctly
  - Calculates weighted-average entry price across multiple buys
  - Partial sell preserves weighted-average entry price and calculates realized P&L
  - Full sell removes holding completely
  - Calculates unrealized P&L mark-to-market and total account equity
  - Rejects invalid quantities (zero, negative, NaN)
  - Rejects buy orders when cash is insufficient
  - Rejects sell orders when holdings are insufficient (when shorting disabled)
  - Handles floating-point residuals gracefully with epsilon tolerance
  - Supports short selling with demo cash and calculates short P&L accurately
- `src/utils/validation.test.js`:
  - Legitimate buy order validation
  - Legitimate sell/short order validation
  - Missing/empty quantity detection
  - Non-numeric input detection
  - Zero and negative quantity rejection
  - Minimum quantity constraint enforcement
  - Maximum quantity threshold enforcement
  - Decimal place precision overflow rejection
  - Insufficient cash rejection
  - Quote availability checking

---

## 9. Author & Submission

- **Assignment:** Mini Real-Time Trading Platform (CapitalStreetFX)
- **Role:** Frontend Developer Evaluation
- **Project:** Delta Trade Pro Trader Terminal
