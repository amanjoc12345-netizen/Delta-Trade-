import { describe, it, expect } from 'vitest';
import { validateOrder } from './validation.js';

describe('Order Validation Engine', () => {
  const btcInstrument = {
    id: 'BTCUSDT',
    symbol: 'BTC/USDT',
    baseAsset: 'BTC',
    quoteAsset: 'USDT',
    decimals: 2,
    qtyDecimals: 4,
    minQty: 0.0001,
    maxQty: 50.0,
  };

  const validQuote = {
    price: 60000,
    bid: 59990,
    ask: 60010,
    timestamp: Date.now(),
  };

  it('Validates a legitimate buy order successfully', () => {
    const result = validateOrder({
      side: 'BUY',
      quantity: '0.1',
      instrument: btcInstrument,
      currentQuote: validQuote,
      availableCash: 10000,
    });

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
    expect(result.executionPrice).toBe(60010); // Ask price for buy
    expect(result.orderValue).toBeCloseTo(6001, 1);
  });

  it('Validates a legitimate sell order successfully', () => {
    const result = validateOrder({
      side: 'SELL',
      quantity: '0.1',
      instrument: btcInstrument,
      currentQuote: validQuote,
      availableCash: 10000,
      allowShort: true,
    });

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
    expect(result.executionPrice).toBe(59990); // Bid price for sell
    expect(result.orderValue).toBeCloseTo(5999, 1);
  });

  it('Catches missing or empty quantity', () => {
    const emptyResult = validateOrder({
      side: 'BUY',
      quantity: '',
      instrument: btcInstrument,
      currentQuote: validQuote,
      availableCash: 10000,
    });

    expect(emptyResult.isValid).toBe(false);
    expect(emptyResult.errors.quantity).toBe('Please enter an order quantity');
  });

  it('Catches non-numeric or NaN quantity', () => {
    const nanResult = validateOrder({
      side: 'BUY',
      quantity: 'abc',
      instrument: btcInstrument,
      currentQuote: validQuote,
      availableCash: 10000,
    });

    expect(nanResult.isValid).toBe(false);
    expect(nanResult.errors.quantity).toBe('Quantity must be a valid number');
  });

  it('Catches zero or negative quantity', () => {
    const zeroResult = validateOrder({
      side: 'BUY',
      quantity: '0',
      instrument: btcInstrument,
      currentQuote: validQuote,
      availableCash: 10000,
    });
    expect(zeroResult.isValid).toBe(false);
    expect(zeroResult.errors.quantity).toBe('Quantity must be greater than zero');

    const negResult = validateOrder({
      side: 'BUY',
      quantity: '-0.5',
      instrument: btcInstrument,
      currentQuote: validQuote,
      availableCash: 10000,
    });
    expect(negResult.isValid).toBe(false);
    expect(negResult.errors.quantity).toBe('Quantity must be greater than zero');
  });

  it('Catches quantity below minimum threshold', () => {
    const result = validateOrder({
      side: 'BUY',
      quantity: '0.00001', // below minQty 0.0001
      instrument: btcInstrument,
      currentQuote: validQuote,
      availableCash: 10000,
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.quantity).toContain('Minimum order quantity');
  });

  it('Catches quantity above maximum limit', () => {
    const result = validateOrder({
      side: 'BUY',
      quantity: '100', // above maxQty 50.0
      instrument: btcInstrument,
      currentQuote: validQuote,
      availableCash: 10000000,
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.quantity).toContain('Maximum order quantity');
  });

  it('Catches decimal precision overflows', () => {
    const result = validateOrder({
      side: 'BUY',
      quantity: '0.123456', // 6 decimals, limit is 4
      instrument: btcInstrument,
      currentQuote: validQuote,
      availableCash: 10000,
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.quantity).toContain('Maximum decimal places allowed is 4');
  });

  it('Catches insufficient cash on buy order', () => {
    const result = validateOrder({
      side: 'BUY',
      quantity: '1.0', // ~60,010 USDT
      instrument: btcInstrument,
      currentQuote: validQuote,
      availableCash: 5000,
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.cash).toContain('Insufficient cash');
  });

  it('Catches unavailable or missing market quotes', () => {
    const result = validateOrder({
      side: 'BUY',
      quantity: '0.1',
      instrument: btcInstrument,
      currentQuote: null,
      availableCash: 10000,
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.quote).toContain('Market quote is currently unavailable');
  });
});
