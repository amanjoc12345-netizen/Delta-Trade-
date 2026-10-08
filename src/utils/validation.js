/**
 * Order Validation Utilities
 */

export function validateOrder({
  side,
  quantity,
  instrument,
  currentQuote,
  availableCash,
  availableHoldings = 0,
  allowShort = true,
}) {
  const errors = {};

  // Quote freshness check
  if (!currentQuote || !Number.isFinite(currentQuote.price) || currentQuote.price <= 0) {
    errors.quote = 'Market quote is currently unavailable';
    return { isValid: false, errors };
  }

  // Quote freshness: check if quote is older than 15 seconds
  if (currentQuote.timestamp && Date.now() - currentQuote.timestamp > 15000) {
    errors.quote = 'Market quote is stale. Waiting for fresh tick...';
  }

  // Quantity presence
  if (quantity === '' || quantity === null || quantity === undefined) {
    errors.quantity = 'Please enter an order quantity';
    return { isValid: false, errors };
  }

  const numQty = Number(quantity);

  // Non-numeric or non-finite check
  if (!Number.isFinite(numQty)) {
    errors.quantity = 'Quantity must be a valid number';
    return { isValid: false, errors };
  }

  // Zero or negative
  if (numQty <= 0) {
    errors.quantity = 'Quantity must be greater than zero';
    return { isValid: false, errors };
  }

  // Min quantity
  if (instrument && instrument.minQty && numQty < instrument.minQty) {
    errors.quantity = `Minimum order quantity is ${instrument.minQty} ${instrument.baseAsset}`;
    return { isValid: false, errors };
  }

  // Max quantity
  if (instrument && instrument.maxQty && numQty > instrument.maxQty) {
    errors.quantity = `Maximum order quantity is ${instrument.maxQty} ${instrument.baseAsset}`;
    return { isValid: false, errors };
  }

  // Precision check
  if (instrument && instrument.qtyDecimals !== undefined) {
    const parts = quantity.toString().split('.');
    if (parts.length > 1 && parts[1].length > instrument.qtyDecimals) {
      errors.quantity = `Maximum decimal places allowed is ${instrument.qtyDecimals}`;
      return { isValid: false, errors };
    }
  }

  // Execution price: Buy at Ask, Sell at Bid
  const executionPrice = side === 'BUY' 
    ? (currentQuote.ask || currentQuote.price) 
    : (currentQuote.bid || currentQuote.price);

  const orderValue = numQty * executionPrice;

  // Available cash is the limit for both BUY and SELL
  if (side === 'BUY') {
    if (orderValue > availableCash) {
      errors.cash = `Insufficient cash. Order requires $${orderValue.toFixed(2)}, available: $${availableCash.toFixed(2)}`;
    }
  } else if (side === 'SELL') {
    if (allowShort) {
      // Selling with shorting enabled: excess over existing long holdings requires cash
      const requiredCash = Math.max(0, (numQty - availableHoldings) * executionPrice);
      if (requiredCash > availableCash) {
        errors.cash = `Insufficient cash. Order requires $${orderValue.toFixed(2)}, available: $${availableCash.toFixed(2)}`;
      }
    } else {
      if (numQty > availableHoldings) {
        errors.holdings = `Insufficient holdings. You own ${availableHoldings} ${instrument.baseAsset}, but tried to sell ${numQty}`;
      }
    }
  }

  const isValid = Object.keys(errors).length === 0;
  return { isValid, errors, executionPrice, orderValue };
}
