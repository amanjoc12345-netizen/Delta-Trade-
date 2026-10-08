import React, { useState, useMemo } from 'react';
import { useTrading } from '../state/useTrading.js';
import { validateOrder } from '../utils/validation.js';
import { formatPrice, formatCurrency, formatQuantity } from '../utils/formatting.js';
import { ShoppingCart, AlertCircle, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import ConfirmOrderDialog from './ConfirmOrderDialog.jsx';

export default function OrderPanel({ instrument, quote }) {
  const { cash, holdings, buyOrder, sellOrder } = useTrading();

  const [side, setSide] = useState('BUY'); // 'BUY' | 'SELL'
  const [quantity, setQuantity] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Available asset quantity owned for this instrument
  const holding = holdings[instrument.id];
  const availableHoldings = holding ? holding.quantity : 0;

  // Execution quote: Ask for Buy, Bid for Sell
  const executionQuote = side === 'BUY'
    ? (quote ? quote.ask || quote.price : instrument.basePrice)
    : (quote ? quote.bid || quote.price : instrument.basePrice);

  // Run validation: Cash is the limit for BOTH Buy and Sell
  const validation = useMemo(() => {
    return validateOrder({
      side,
      quantity,
      instrument,
      currentQuote: quote,
      availableCash: cash,
      availableHoldings,
      allowShort: true,
    });
  }, [side, quantity, instrument, quote, cash, availableHoldings]);

  // Handle Quick Percentage Sizing based on Available Cash for BOTH Buy and Sell
  const handleQuickPercent = (pct) => {
    if (!executionQuote || executionQuote <= 0 || !cash || cash <= 0) return;

    const budget = cash * (pct / 100);
    const computedQty = budget / executionQuote;
    const rounded = Number(computedQty.toFixed(instrument.qtyDecimals));
    setQuantity(rounded.toString());
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validation.isValid) return;
    setShowConfirmDialog(true);
  };

  const handleConfirmOrder = () => {
    if (!validation.isValid || isSubmitting) return;

    setIsSubmitting(true);

    // Brief simulation latency
    setTimeout(() => {
      if (side === 'BUY') {
        buyOrder({
          symbol: instrument.id,
          quantity: Number(quantity),
          price: executionQuote,
        });
      } else {
        sellOrder({
          symbol: instrument.id,
          quantity: Number(quantity),
          price: executionQuote,
          allowShort: true,
        });
      }

      setIsSubmitting(false);
      setShowConfirmDialog(false);
      setQuantity('');
    }, 180);
  };

  return (
    <aside className="workspace-panel order-panel" aria-label="Order Entry">
      <div className="panel-header">
        <div className="panel-title-group">
          <ShoppingCart size={14} className="panel-icon" aria-hidden="true" />
          <h2 className="panel-title">Order Entry</h2>
        </div>
        <span className="inst-sub font-mono">{instrument.symbol}</span>
      </div>

      <div className="order-panel-body">
        {/* Buy / Sell Segmented Control */}
        <div className="side-segmented-control" role="group" aria-label="Order Side">
          <button
            type="button"
            className={`side-segment-btn buy ${side === 'BUY' ? 'active' : ''}`}
            onClick={() => setSide('BUY')}
            id="order-side-buy-btn"
          >
            <ArrowUpCircle size={14} />
            <span>BUY</span>
          </button>
          <button
            type="button"
            className={`side-segment-btn sell ${side === 'SELL' ? 'active' : ''}`}
            onClick={() => setSide('SELL')}
            id="order-side-sell-btn"
          >
            <ArrowDownCircle size={14} />
            <span>SELL</span>
          </button>
        </div>

        {/* Live Execution Quote */}
        <div className="execution-quote-box">
          <span className="quote-label">
            {side === 'BUY' ? 'Execution Ask Quote' : 'Execution Bid Quote'}
          </span>
          <span className="quote-value font-mono">
            ${formatPrice(executionQuote, instrument.decimals)}
          </span>
        </div>

        {/* Available Balance / Margin Bar (Equal for Buy & Sell) */}
        <div className="available-balance-bar">
          <span className="avail-label">Available Cash:</span>
          <span className="avail-value font-mono">
            {formatCurrency(cash)}
          </span>
        </div>

        {/* Existing Position indicator if active */}
        {holding && holding.quantity > 0 && (
          <div className="available-balance-bar" style={{ marginTop: '2px', opacity: 0.85 }}>
            <span className="avail-label">Open Position:</span>
            <span className="avail-value font-mono">
              {formatQuantity(holding.quantity, instrument.qtyDecimals)} {instrument.baseAsset} ({holding.side === 'SELL' ? 'SHORT' : 'LONG'})
            </span>
          </div>
        )}

        {/* Order Form */}
        <form onSubmit={handleSubmit} className="order-form" noValidate>
          {/* Quantity Input Field */}
          <div className="form-field-group">
            <div className="field-header">
              <label htmlFor="order-quantity-input" className="field-label">
                Quantity ({instrument.baseAsset})
              </label>
              <span className="field-sub font-mono">
                Min: {instrument.minQty}
              </span>
            </div>

            <div className="input-wrapper">
              <input
                id="order-quantity-input"
                type="number"
                step="any"
                min={instrument.minQty}
                placeholder={`0.00 (${instrument.baseAsset})`}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className={`order-input font-mono ${validation.errors.quantity ? 'error' : ''}`}
                aria-invalid={!!validation.errors.quantity}
                aria-describedby={validation.errors.quantity ? 'qty-error' : undefined}
              />
            </div>

            {/* Inline Quantity Error */}
            {validation.errors.quantity && (
              <span id="qty-error" className="field-error-text" role="alert">
                <AlertCircle size={12} />
                <span>{validation.errors.quantity}</span>
              </span>
            )}
          </div>

          {/* Quick Percentage Sizing Buttons */}
          <div className="quick-percentages" role="group" aria-label="Quick order size">
            {[25, 50, 75, 100].map((pct) => (
              <button
                key={pct}
                type="button"
                className="pct-button"
                onClick={() => handleQuickPercent(pct)}
              >
                {pct}%
              </button>
            ))}
          </div>

          {/* Order Summary Box */}
          <div className="order-summary-box">
            <div className="summary-row">
              <span className="sum-label">Order Type:</span>
              <span className="sum-val">Spot Market</span>
            </div>
            <div className="summary-row">
              <span className="sum-label">Estimated Value:</span>
              <span className="sum-val font-mono">
                ${formatPrice(validation.orderValue || 0, 2)} USDT
              </span>
            </div>
            <div className="summary-row">
              <span className="sum-label">Trading Fee:</span>
              <span className="sum-val font-mono">0.00 USDT (Demo)</span>
            </div>
          </div>

          {/* Inline Cash or Holdings Error */}
          {validation.errors.cash && (
            <div className="form-alert-box error" role="alert">
              <AlertCircle size={14} />
              <span>{validation.errors.cash}</span>
            </div>
          )}

          {validation.errors.holdings && (
            <div className="form-alert-box error" role="alert">
              <AlertCircle size={14} />
              <span>{validation.errors.holdings}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!validation.isValid}
            className={`submit-order-button ${side.toLowerCase()}`}
            id="order-submit-btn"
          >
            {side === 'BUY' ? `Buy ${instrument.baseAsset}` : `Sell ${instrument.baseAsset}`}
          </button>
        </form>
      </div>

      {/* Accessible Confirmation Dialog */}
      {showConfirmDialog && (
        <ConfirmOrderDialog
          instrument={instrument}
          side={side}
          quantity={Number(quantity)}
          executionQuote={executionQuote}
          orderValue={validation.orderValue}
          isSubmitting={isSubmitting}
          onConfirm={handleConfirmOrder}
          onClose={() => setShowConfirmDialog(false)}
        />
      )}
    </aside>
  );
}
