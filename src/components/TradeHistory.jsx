import React from 'react';
import { formatPrice, formatCurrency, formatDateTime, formatQuantity } from '../utils/formatting.js';
import { History } from 'lucide-react';

export default function TradeHistory({ history }) {
  if (!history || history.length === 0) {
    return (
      <div className="table-empty-state">
        <History size={32} className="empty-icon" aria-hidden="true" />
        <span className="empty-title">No Trade History</span>
        <span className="empty-desc">
          Completed Buy and Sell executions will appear here immediately without page refreshes.
        </span>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="dock-data-table" aria-label="Executed Trade History">
        <thead>
          <tr>
            <th>Trade ID</th>
            <th>Time</th>
            <th>Asset</th>
            <th>Side</th>
            <th className="align-right">Quantity</th>
            <th className="align-right">Execution Price</th>
            <th className="align-right">Total Value</th>
            <th className="align-right">Realised P&L</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {history.map((t) => {
            const hasRealizedPnL = t.realizedPnL !== null && t.realizedPnL !== undefined;
            const isProfit = hasRealizedPnL && t.realizedPnL >= 0;

            return (
              <tr key={t.id} className="data-row">
                <td className="trade-id font-mono">{t.id}</td>
                <td className="trade-time">{formatDateTime(t.timestamp)}</td>
                <td className="symbol-cell">
                  <strong>{t.symbol}</strong>
                </td>
                <td>
                  <span className={`side-tag ${t.side.toLowerCase()}`}>
                    {t.side}
                  </span>
                </td>
                <td className="align-right font-mono">
                  {formatQuantity(t.quantity, 4)}
                </td>
                <td className="align-right font-mono">
                  ${formatPrice(t.price, 2)}
                </td>
                <td className="align-right font-mono">
                  {formatCurrency(t.value)}
                </td>
                <td className="align-right font-mono">
                  {hasRealizedPnL ? (
                    <span className={`pnl-inline ${isProfit ? 'profit' : 'loss'}`}>
                      {formatCurrency(t.realizedPnL, true)}
                    </span>
                  ) : (
                    <span className="text-muted">---</span>
                  )}
                </td>
                <td>
                  <span className="status-tag filled">{t.status}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
