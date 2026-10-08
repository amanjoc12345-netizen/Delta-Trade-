import { describe, it, expect } from 'vitest';
import {
  executeBuy,
  executeSell,
  calculateHoldingsDetails,
  calculateAccountMetrics,
} from './accounting.js';

describe('Delta Trade Accounting Business Logic', () => {
  const initialAccount = {
    cash: 10000,
    holdings: {},
    history: [],
  };

  it('Buying updates cash and holdings correctly', () => {
    // Buy 0.1 BTC @ 50,000 USDT -> cost: 5,000 USDT
    const { nextState, trade } = executeBuy(initialAccount, {
      symbol: 'BTCUSDT',
      quantity: 0.1,
      price: 50000,
    });

    expect(nextState.cash).toBe(5000);
    expect(nextState.holdings['BTCUSDT']).toBeDefined();
    expect(nextState.holdings['BTCUSDT'].quantity).toBe(0.1);
    expect(nextState.holdings['BTCUSDT'].avgEntryPrice).toBe(50000);
    expect(trade.side).toBe('BUY');
    expect(trade.value).toBe(5000);
    expect(nextState.history.length).toBe(1);
  });

  it('Calculates weighted-average entry price accurately on multiple buys', () => {
    // Buy 1: 0.1 BTC @ 40,000 -> Cost: 4,000
    const step1 = executeBuy(initialAccount, {
      symbol: 'BTCUSDT',
      quantity: 0.1,
      price: 40000,
    }).nextState;

    // Buy 2: 0.1 BTC @ 60,000 -> Cost: 6,000
    // Total cost: 10,000; Total qty: 0.2; Weighted avg = 10,000 / 0.2 = 50,000
    const step2 = executeBuy(step1, {
      symbol: 'BTCUSDT',
      quantity: 0.1,
      price: 60000,
    }).nextState;

    expect(step2.cash).toBe(0);
    expect(step2.holdings['BTCUSDT'].quantity).toBe(0.2);
    expect(step2.holdings['BTCUSDT'].avgEntryPrice).toBe(50000);
  });

  it('Partial sell preserves weighted-average entry price and calculates realized P&L', () => {
    // Start with 0.2 BTC @ avg 50,000 (Cost: 10,000)
    const stateWithHoldings = {
      cash: 2000,
      holdings: {
        BTCUSDT: { symbol: 'BTCUSDT', quantity: 0.2, avgEntryPrice: 50000 },
      },
      history: [],
    };

    // Sell 0.05 BTC @ 60,000 -> Proceeds: 3,000. Realized PnL: 0.05 * (60,000 - 50,000) = +500
    const { nextState, trade } = executeSell(stateWithHoldings, {
      symbol: 'BTCUSDT',
      quantity: 0.05,
      price: 60000,
    });

    expect(nextState.cash).toBe(5000); // 2000 + 3000
    expect(nextState.holdings['BTCUSDT'].quantity).toBe(0.15);
    expect(nextState.holdings['BTCUSDT'].avgEntryPrice).toBe(50000); // Preserved!
    expect(trade.realizedPnL).toBe(500);
    expect(trade.side).toBe('SELL');
  });

  it('Full sell removes the holding completely', () => {
    const stateWithHoldings = {
      cash: 1000,
      holdings: {
        ETHUSDT: { symbol: 'ETHUSDT', quantity: 2, avgEntryPrice: 2500 },
      },
      history: [],
    };

    // Sell all 2 ETH @ 2700 -> Proceeds: 5400. Realized PnL: 2 * 200 = 400
    const { nextState, trade } = executeSell(stateWithHoldings, {
      symbol: 'ETHUSDT',
      quantity: 2,
      price: 2700,
    });

    expect(nextState.cash).toBe(6400);
    expect(nextState.holdings['ETHUSDT']).toBeUndefined();
    expect(trade.realizedPnL).toBe(400);
  });

  it('Calculates Unrealized P&L mark-to-market and Total Equity', () => {
    const holdings = {
      BTCUSDT: { symbol: 'BTCUSDT', quantity: 0.1, avgEntryPrice: 50000 }, // Cost: 5000
    };
    const quotes = {
      BTCUSDT: { bid: 55000, ask: 55050, price: 55000 },
    };

    const detailed = calculateHoldingsDetails(holdings, quotes);
    expect(detailed.length).toBe(1);
    expect(detailed[0].marketValue).toBe(5500);
    expect(detailed[0].unrealizedPnL).toBe(500);
    expect(detailed[0].unrealizedPnLPercent).toBe(10);

    const metrics = calculateAccountMetrics(5000, detailed);
    expect(metrics.cash).toBe(5000);
    expect(metrics.holdingsValue).toBe(5500);
    expect(metrics.equity).toBe(10500);
    expect(metrics.unrealizedPnL).toBe(500);
  });

  it('Rejects invalid order quantities (zero, negative, non-numeric)', () => {
    expect(() => {
      executeBuy(initialAccount, { symbol: 'BTCUSDT', quantity: 0, price: 50000 });
    }).toThrow(/Quantity must be a positive finite number/);

    expect(() => {
      executeBuy(initialAccount, { symbol: 'BTCUSDT', quantity: -1, price: 50000 });
    }).toThrow(/Quantity must be a positive finite number/);

    expect(() => {
      executeBuy(initialAccount, { symbol: 'BTCUSDT', quantity: NaN, price: 50000 });
    }).toThrow(/Quantity must be a positive finite number/);
  });

  it('Rejects buy orders when cash is insufficient', () => {
    // 1 BTC @ 50,000 requires 50,000 cash, but available is only 10,000
    expect(() => {
      executeBuy(initialAccount, { symbol: 'BTCUSDT', quantity: 1, price: 50000 });
    }).toThrow(/Insufficient cash/);
  });

  it('Rejects sell orders when holdings are insufficient', () => {
    const state = {
      cash: 1000,
      holdings: {
        SOLUSDT: { symbol: 'SOLUSDT', quantity: 5, avgEntryPrice: 150 },
      },
      history: [],
    };

    expect(() => {
      executeSell(state, { symbol: 'SOLUSDT', quantity: 6, price: 160 });
    }).toThrow(/Insufficient holdings/);

    expect(() => {
      executeSell(state, { symbol: 'ETHUSDT', quantity: 1, price: 2500 });
    }).toThrow(/No holdings available/);
  });

  it('Handles floating-point residuals gracefully with tolerance', () => {
    // 0.1 + 0.2 in JS = 0.30000000000000004
    const state = {
      cash: 1000,
      holdings: {
        BTCUSDT: { symbol: 'BTCUSDT', quantity: 0.30000000000000004, avgEntryPrice: 50000 },
      },
      history: [],
    };

    // Sell 0.3
    const { nextState } = executeSell(state, {
      symbol: 'BTCUSDT',
      quantity: 0.3,
      price: 50000,
    });

    // Residual should be cleaned and holding deleted
    expect(nextState.holdings['BTCUSDT']).toBeUndefined();
  });

  it('Supports short selling with demo cash and computes short P&L accurately', () => {
    // Sell (Short) 0.1 BTC @ 50,000 using cash (5,000 USDT cost)
    const { nextState, trade } = executeSell(initialAccount, {
      symbol: 'BTCUSDT',
      quantity: 0.1,
      price: 50000,
    }, { allowShort: true });

    expect(nextState.cash).toBe(5000);
    expect(nextState.holdings['BTCUSDT']).toBeDefined();
    expect(nextState.holdings['BTCUSDT'].side).toBe('SELL');
    expect(nextState.holdings['BTCUSDT'].quantity).toBe(0.1);
    expect(nextState.holdings['BTCUSDT'].avgEntryPrice).toBe(50000);
    expect(trade.side).toBe('SELL');

    // Price drops to 40,000 (ask 40,050): Short position gains profit!
    const quotesGain = { BTCUSDT: { bid: 40000, ask: 40050, price: 40000 } };
    const detailsGain = calculateHoldingsDetails(nextState.holdings, quotesGain);
    expect(detailsGain[0].unrealizedPnL).toBe(995); // 0.1 * (50000 - 40050 ask) = +995

    // Price rises to 60,000 (ask 60,050): Short position shows loss
    const quotesLoss = { BTCUSDT: { bid: 60000, ask: 60050, price: 60000 } };
    const detailsLoss = calculateHoldingsDetails(nextState.holdings, quotesLoss);
    expect(detailsLoss[0].unrealizedPnL).toBe(-1005); // 0.1 * (50000 - 60050 ask) = -1005

    // Closing short by buying 0.1 BTC @ 40,000 -> Realized profit +1,000, cash returned = 5000 + 5000 (orig) + 1000 (pnl) = 11,000
    const closeStep = executeBuy(nextState, {
      symbol: 'BTCUSDT',
      quantity: 0.1,
      price: 40000,
    });
    expect(closeStep.nextState.holdings['BTCUSDT']).toBeUndefined();
    expect(closeStep.nextState.cash).toBe(11000);
    expect(closeStep.trade.realizedPnL).toBe(1000);
  });
});
