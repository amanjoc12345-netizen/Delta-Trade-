/**
 * Pure JavaScript Accounting Engine for Spot Trading
 *
 * Rules:
 * - Starting cash: 10,000 USDT
 * - Spot only: no leverage, no short selling, no fees.
 * - Buys execute at Ask price; Sells execute at Bid price.
 * - Buys calculate a weighted-average entry price.
 * - Partial sells reduce quantity while preserving the weighted-average entry price.
 * - Full sells remove the asset holding.
 * - Realized P&L is recorded upon selling.
 * - Mark-to-market unrealized P&L is calculated dynamically against current market bid.
 * - Equity = cash + total holdings market value.
 */

const FLOAT_TOLERANCE = 1e-8;

/**
 * Clean floating-point precision issues
 */
export function roundFloat(num, decimals = 8) {
  if (Math.abs(num) < FLOAT_TOLERANCE) return 0;
  return Number(num.toFixed(decimals));
}

/**
 * Execute Spot Buy Order
 * @param {Object} state - { cash, holdings, history }
 * @param {Object} order - { symbol, quantity, price, timestamp }
 * @returns {Object} { nextState, trade }
 */
export function executeBuy(state, { symbol, quantity, price, timestamp = Date.now() }) {
  if (!symbol) throw new Error('Symbol is required');
  const qty = Number(quantity);
  const prc = Number(price);

  if (!Number.isFinite(qty) || qty <= 0) {
    throw new Error('Quantity must be a positive finite number');
  }
  if (!Number.isFinite(prc) || prc <= 0) {
    throw new Error('Execution price must be a positive finite number');
  }

  const orderValue = roundFloat(qty * prc, 4);
  const existing = state.holdings[symbol];

  // If existing position is a SHORT (SELL) position, Buy closes/reduces it
  if (existing && existing.side === 'SELL' && existing.quantity > FLOAT_TOLERANCE) {
    const closingQty = Math.min(qty, existing.quantity);
    const excessQty = roundFloat(qty - closingQty, 6);

    // Realized P&L on Short: (entryPrice - executionPrice) * closingQty
    const realizedPnL = roundFloat(closingQty * (existing.avgEntryPrice - prc), 2);
    const capitalReturned = roundFloat(closingQty * existing.avgEntryPrice, 2);
    let newCash = roundFloat(state.cash + capitalReturned + realizedPnL, 2);

    const remainingShortQty = roundFloat(existing.quantity - closingQty, 6);
    const nextHoldings = { ...state.holdings };

    if (remainingShortQty <= FLOAT_TOLERANCE) {
      delete nextHoldings[symbol];
    } else {
      nextHoldings[symbol] = {
        ...existing,
        quantity: remainingShortQty,
      };
    }

    // Excess buy quantity flips into a LONG position
    if (excessQty > FLOAT_TOLERANCE) {
      const excessCost = roundFloat(excessQty * prc, 4);
      if (excessCost > newCash + FLOAT_TOLERANCE) {
        throw new Error(`Insufficient cash. Required: ${excessCost.toFixed(2)} USDT, Available: ${newCash.toFixed(2)} USDT`);
      }
      newCash = roundFloat(newCash - excessCost, 2);
      nextHoldings[symbol] = {
        symbol,
        side: 'BUY',
        quantity: excessQty,
        avgEntryPrice: prc,
      };
    }

    const trade = {
      id: 'TRD-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      symbol,
      side: 'BUY',
      quantity: qty,
      price: prc,
      value: orderValue,
      realizedPnL,
      timestamp,
      status: 'FILLED',
    };

    const nextState = {
      ...state,
      cash: newCash,
      holdings: nextHoldings,
      history: [trade, ...(state.history || [])],
    };

    return { nextState, trade };
  }

  // Opening or adding to a LONG (BUY) position using Available Cash
  if (orderValue > state.cash + FLOAT_TOLERANCE) {
    throw new Error(
      `Insufficient cash. Required: ${orderValue.toFixed(2)} USDT, Available: ${state.cash.toFixed(2)} USDT`
    );
  }

  const newCash = roundFloat(Math.max(0, state.cash - orderValue), 2);
  const prevQty = (existing && existing.side === 'BUY') ? existing.quantity : 0;
  const prevAvg = (existing && existing.side === 'BUY') ? existing.avgEntryPrice : 0;

  const newQty = roundFloat(prevQty + qty, 6);
  const prevCost = prevQty * prevAvg;
  const addedCost = qty * prc;
  const newAvgPrice = roundFloat((prevCost + addedCost) / newQty, 4);

  const trade = {
    id: 'TRD-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
    symbol,
    side: 'BUY',
    quantity: qty,
    price: prc,
    value: orderValue,
    realizedPnL: null,
    timestamp,
    status: 'FILLED',
  };

  const nextHoldings = {
    ...state.holdings,
    [symbol]: {
      symbol,
      side: 'BUY',
      quantity: newQty,
      avgEntryPrice: newAvgPrice,
    },
  };

  const nextState = {
    ...state,
    cash: newCash,
    holdings: nextHoldings,
    history: [trade, ...(state.history || [])],
  };

  return { nextState, trade };
}

/**
 * Execute Sell Order
 * - If holding exists as BUY: closes/reduces the LONG position.
 * - If no holding or holding is SELL: opens/increases SHORT position using Available Cash (when allowShort is enabled).
 */
export function executeSell(state, order, options = {}) {
  const allowShort = options.allowShort ?? order.allowShort ?? false;
  const { symbol, quantity, price, timestamp = Date.now() } = order || {};
  if (!symbol) throw new Error('Symbol is required');
  const qty = Number(quantity);
  const prc = Number(price);

  if (!Number.isFinite(qty) || qty <= 0) {
    throw new Error('Quantity must be a positive finite number');
  }
  if (!Number.isFinite(prc) || prc <= 0) {
    throw new Error('Execution price must be a positive finite number');
  }

  const orderValue = roundFloat(qty * prc, 4);
  const existing = state.holdings[symbol];

  // Case 1: Existing position is a BUY (Long) position -> Sell closes/reduces it
  if (existing && existing.side !== 'SELL' && existing.quantity > FLOAT_TOLERANCE) {
    if (!allowShort && qty > existing.quantity + FLOAT_TOLERANCE) {
      throw new Error(
        `Insufficient holdings. Attempted to sell ${qty}, but you only own ${existing.quantity} ${symbol}`
      );
    }

    const closingQty = Math.min(qty, existing.quantity);
    const excessQty = roundFloat(qty - closingQty, 6);

    // Realized P&L = quantity * (executionPrice - avgEntryPrice)
    const realizedPnL = roundFloat(closingQty * (prc - existing.avgEntryPrice), 2);
    const capitalReturned = roundFloat(closingQty * existing.avgEntryPrice, 2);
    let newCash = roundFloat(state.cash + capitalReturned + realizedPnL, 2);

    const remainingQty = roundFloat(existing.quantity - closingQty, 6);
    const nextHoldings = { ...state.holdings };

    if (remainingQty <= FLOAT_TOLERANCE) {
      delete nextHoldings[symbol];
    } else {
      nextHoldings[symbol] = {
        ...existing,
        quantity: remainingQty,
        avgEntryPrice: existing.avgEntryPrice,
      };
    }

    // If shorting is allowed and excess exists, excess opens a SHORT position with cash
    if (allowShort && excessQty > FLOAT_TOLERANCE) {
      const excessCost = roundFloat(excessQty * prc, 4);
      if (excessCost > newCash + FLOAT_TOLERANCE) {
        throw new Error(`Insufficient cash. Required: ${excessCost.toFixed(2)} USDT, Available: ${newCash.toFixed(2)} USDT`);
      }
      newCash = roundFloat(newCash - excessCost, 2);
      nextHoldings[symbol] = {
        symbol,
        side: 'SELL',
        quantity: excessQty,
        avgEntryPrice: prc,
      };
    }

    const trade = {
      id: 'TRD-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      symbol,
      side: 'SELL',
      quantity: qty,
      price: prc,
      value: orderValue,
      realizedPnL,
      timestamp,
      status: 'FILLED',
    };

    const nextState = {
      ...state,
      cash: newCash,
      holdings: nextHoldings,
      history: [trade, ...(state.history || [])],
    };

    return { nextState, trade };
  }

  // Case 2: Opening or adding to a SHORT (SELL) position using Available Cash
  if (!allowShort) {
    if (!existing || existing.quantity < FLOAT_TOLERANCE) {
      throw new Error(`No holdings available to sell for ${symbol}`);
    }
  }

  if (orderValue > state.cash + FLOAT_TOLERANCE) {
    throw new Error(
      `Insufficient cash. Required: ${orderValue.toFixed(2)} USDT, Available: ${state.cash.toFixed(2)} USDT`
    );
  }

  const newCash = roundFloat(Math.max(0, state.cash - orderValue), 2);
  const prevQty = (existing && existing.side === 'SELL') ? existing.quantity : 0;
  const prevAvg = (existing && existing.side === 'SELL') ? existing.avgEntryPrice : 0;

  const newQty = roundFloat(prevQty + qty, 6);
  const prevCost = prevQty * prevAvg;
  const addedCost = qty * prc;
  const newAvgPrice = roundFloat((prevCost + addedCost) / newQty, 4);

  const trade = {
    id: 'TRD-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
    symbol,
    side: 'SELL',
    quantity: qty,
    price: prc,
    value: orderValue,
    realizedPnL: null,
    timestamp,
    status: 'FILLED',
  };

  const nextHoldings = {
    ...state.holdings,
    [symbol]: {
      symbol,
      side: 'SELL',
      quantity: newQty,
      avgEntryPrice: newAvgPrice,
    },
  };

  const nextState = {
    ...state,
    cash: newCash,
    holdings: nextHoldings,
    history: [trade, ...(state.history || [])],
  };

  return { nextState, trade };
}

/**
 * Calculate Unrealized P&L and Market Value for each holding (Long and Short)
 */
export function calculateHoldingsDetails(holdings, quotes = {}) {
  return Object.values(holdings)
    .filter(h => h.quantity > FLOAT_TOLERANCE)
    .map(h => {
      const q = quotes[h.symbol] || quotes[h.symbol.replace('/', '')] || {};
      const side = h.side || 'BUY';
      const currentPrice = side === 'BUY'
        ? (q.bid || q.price || h.avgEntryPrice)
        : (q.ask || q.price || h.avgEntryPrice);
      const costBasis = roundFloat(h.quantity * h.avgEntryPrice, 2);

      // Long profits when price rises; Short profits when price falls
      const unrealizedPnL = side === 'BUY'
        ? roundFloat(h.quantity * (currentPrice - h.avgEntryPrice), 2)
        : roundFloat(h.quantity * (h.avgEntryPrice - currentPrice), 2);

      const marketValue = roundFloat(Math.max(0, costBasis + unrealizedPnL), 2);
      const unrealizedPnLPercent = costBasis > 0 
        ? roundFloat((unrealizedPnL / costBasis) * 100, 2) 
        : 0;

      return {
        symbol: h.symbol,
        side,
        quantity: h.quantity,
        avgEntryPrice: h.avgEntryPrice,
        currentPrice,
        marketValue,
        costBasis,
        unrealizedPnL,
        unrealizedPnLPercent,
      };
    });
}

/**
 * Calculate Account Equity and Total Floating P&L
 * Equity = Cash + Total Market Value of Holdings
 */
export function calculateAccountMetrics(cash, detailedHoldings = []) {
  let totalHoldingsValue = 0;
  let totalUnrealizedPnL = 0;

  detailedHoldings.forEach(h => {
    totalHoldingsValue += h.marketValue;
    totalUnrealizedPnL += h.unrealizedPnL;
  });

  const equity = roundFloat(cash + totalHoldingsValue, 2);

  return {
    cash: roundFloat(cash, 2),
    holdingsValue: roundFloat(totalHoldingsValue, 2),
    equity,
    unrealizedPnL: roundFloat(totalUnrealizedPnL, 2),
  };
}
