import React, { useEffect, useRef } from 'react';
import { formatPrice, formatQuantity } from '../utils/formatting.js';
import { ShieldCheck, AlertCircle, X, RefreshCw } from 'lucide-react';

export default function ConfirmOrderDialog({
  instrument,
  side,
  quantity,
  executionQuote,
  orderValue,
  isSubmitting,
  onConfirm,
  onClose,
}) {
  const confirmBtnRef = useRef(null);

  // Focus confirm button and listen for Escape key
  useEffect(() => {
    confirmBtnRef.current?.focus();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isSubmitting]);

  return (
    <div
      className="dialog-backdrop"
      onClick={!isSubmitting ? onClose : undefined}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-order-title"
    >
      <div className="dialog-card confirm-order-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="dialog-header">
          <div className="title-with-icon">
            <ShieldCheck size={18} className="dialog-icon" />
            <h3 id="confirm-order-title" className="dialog-title">Review Spot Order</h3>
          </div>
          {!isSubmitting && (
            <button className="dialog-close-btn" onClick={onClose} aria-label="Cancel order">
              <X size={16} />
            </button>
          )}
        </div>

        {/* Order Details Body */}
        <div className="dialog-body">
          <div className="order-summary-grid">
            <div className="summary-item">
              <span className="sum-k">Instrument</span>
              <span className="sum-v">{instrument.symbol}</span>
            </div>

            <div className="summary-item">
              <span className="sum-k">Side</span>
              <span className={`sum-badge ${side.toLowerCase()}`}>
                {side}
              </span>
            </div>

            <div className="summary-item">
              <span className="sum-k">Quantity</span>
              <span className="sum-v font-mono">
                {formatQuantity(quantity, instrument.qtyDecimals)} {instrument.baseAsset}
              </span>
            </div>

            <div className="summary-item">
              <span className="sum-k">Execution Quote</span>
              <span className="sum-v font-mono">
                ${formatPrice(executionQuote, instrument.decimals)}
              </span>
            </div>

            <div className="summary-item total-row">
              <span className="sum-k">Total Value</span>
              <span className="sum-v font-mono total-val">
                ${formatPrice(orderValue, 2)} USDT
              </span>
            </div>
          </div>

          <div className="dialog-notice-box">
            <AlertCircle size={14} className="notice-icon" />
            <span>This is a simulated demo trade. No real funds or brokerage orders are used.</span>
          </div>
        </div>

        {/* Actions */}
        <div className="dialog-actions">
          <button
            type="button"
            className="dialog-btn secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            className={`dialog-btn primary ${side.toLowerCase()}`}
            onClick={onConfirm}
            disabled={isSubmitting}
            id="dialog-confirm-submit-btn"
          >
            {isSubmitting ? (
              <>
                <RefreshCw size={14} className="spin-icon" />
                <span>Executing...</span>
              </>
            ) : (
              `Confirm ${side}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
