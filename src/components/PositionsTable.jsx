import React from 'react';
import { calculateHoldingsDetails } from '../utils/accounting.js';
import { formatPrice, formatCurrency, formatPercent, formatQuantity } from '../utils/formatting.js';
import { Briefcase, ArrowRight, X } from 'lucide-react';

export default function PositionsTable({ holdings, quotes, onSelectInstrument, onClosePosition }) {
  const detailed = calculateHoldingsDetails(holdings, quotes);

  if (detailed.length === 0) {
    return (
      <div className="table-empty-state">
        <Briefcase size={32} className="empty-icon" aria-hidden="true" />
        <span className="empty-title">No Open Positions</span>
        <span className="empty-desc">
          Take a trade from the order entry panel to open a position in your demo terminal.
        </span>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="dock-data-table" aria-label="Open Positions">
        <thead>
          <tr>
            <th>Asset</th>
            <th className="align-center">Side</th>
            <th className="align-right">Quantity</th>
            <th className="align-right">Avg Entry Price</th>
            <th className="align-right">Current Market Price</th>
            <th className="align-right">Market Value</th>
            <th className="align-right">Unrealised P&L</th>
            <th className="align-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {detailed.map((h) => {
            const isProfit = h.unrealizedPnL >= 0;
            const isShort = h.side === 'SELL';
            return (
              <tr key={h.symbol} className="data-row">
                <td className="symbol-cell">
                  <strong>{h.symbol}</strong>
                </td>
                <td className="align-center">
                  <span className={`side-badge ${isShort ? 'short' : 'long'}`}>
                    {isShort ? 'SHORT' : 'LONG'}
                  </span>
                </td>
                <td className="align-right font-mono">
                  {formatQuantity(h.quantity, 4)}
                </td>
                <td className="align-right font-mono">
                  ${formatPrice(h.avgEntryPrice, 2)}
                </td>
                <td className="align-right font-mono">
                  ${formatPrice(h.currentPrice, 2)}
                </td>
                <td className="align-right font-mono">
                  {formatCurrency(h.marketValue)}
                </td>
                <td className="align-right font-mono">
                  <div className={`pnl-val-block ${isProfit ? 'profit' : 'loss'}`}>
                    <span>{formatCurrency(h.unrealizedPnL, true)}</span>
                    <span className="pnl-sub">({formatPercent(h.unrealizedPnLPercent)})</span>
                  </div>
                </td>
                <td className="align-center table-actions-cell">
                  <div className="actions-cluster">
                    {onClosePosition && (
                      <button
                        className="row-action-btn close-btn"
                        onClick={() => onClosePosition(h)}
                        title={`Close ${h.symbol} position at market price`}
                        aria-label={`Close ${h.symbol} position`}
                      >
                        <X size={11} />
                        <span>Close</span>
                      </button>
                    )}
                    <button
                      className="row-action-btn"
                      onClick={() => onSelectInstrument(h.symbol)}
                      title={`View ${h.symbol} chart & trade ticket`}
                      aria-label={`Trade ${h.symbol}`}
                    >
                      <span>Chart</span>
                      <ArrowRight size={11} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
