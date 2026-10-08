/**
 * Delta Trade Supported Market Instruments
 * 5 crypto pairs traded spot against USDT
 */

export const INSTRUMENTS = [
  {
    id: 'BTCUSDT',
    symbol: 'BTC/USDT',
    name: 'Bitcoin',
    baseAsset: 'BTC',
    quoteAsset: 'USDT',
    decimals: 2,
    qtyDecimals: 4,
    minQty: 0.0001,
    maxQty: 10,
    stepQty: 0.0001,
    basePrice: 88500.0,
    spreadPct: 0.0003, // 0.03% spread
    volatility: 35.0,
  },
  {
    id: 'ETHUSDT',
    symbol: 'ETH/USDT',
    name: 'Ethereum',
    baseAsset: 'ETH',
    quoteAsset: 'USDT',
    decimals: 2,
    qtyDecimals: 4,
    minQty: 0.001,
    maxQty: 100,
    stepQty: 0.001,
    basePrice: 2680.0,
    spreadPct: 0.0004,
    volatility: 3.5,
  },
  {
    id: 'SOLUSDT',
    symbol: 'SOL/USDT',
    name: 'Solana',
    baseAsset: 'SOL',
    quoteAsset: 'USDT',
    decimals: 2,
    qtyDecimals: 2,
    minQty: 0.01,
    maxQty: 1000,
    stepQty: 0.01,
    basePrice: 184.5,
    spreadPct: 0.0006,
    volatility: 0.8,
  },
  {
    id: 'XRPUSDT',
    symbol: 'XRP/USDT',
    name: 'XRP',
    baseAsset: 'XRP',
    quoteAsset: 'USDT',
    decimals: 4,
    qtyDecimals: 1,
    minQty: 1,
    maxQty: 100000,
    stepQty: 1,
    basePrice: 0.5840,
    spreadPct: 0.0008,
    volatility: 0.003,
  },
  {
    id: 'DOGEUSDT',
    symbol: 'DOGE/USDT',
    name: 'Dogecoin',
    baseAsset: 'DOGE',
    quoteAsset: 'USDT',
    decimals: 5,
    qtyDecimals: 0,
    minQty: 10,
    maxQty: 500000,
    stepQty: 10,
    basePrice: 0.16520,
    spreadPct: 0.001,
    volatility: 0.0008,
  },
];

export const DEFAULT_INSTRUMENT = INSTRUMENTS[0]; // BTC/USDT

export const TIMEFRAMES = [
  { id: '1m', label: '1m', seconds: 60 },
  { id: '5m', label: '5m', seconds: 300 },
  { id: '15m', label: '15m', seconds: 900 },
  { id: '1h', label: '1h', seconds: 3600 },
];

export const INITIAL_ACCOUNT_CASH = 10000; // 10,000 USDT starting cash
