import React, { useMemo } from 'react';
import { useTrading } from '../state/useTrading.js';
import { calculateHoldingsDetails, calculateAccountMetrics } from '../utils/accounting.js';
import { formatCurrency, formatPercent } from '../utils/formatting.js';

export default function AccountSummary({ quotes }) {
  const { cash, holdings } = useTrading();

  const metrics = useMemo(() => {
    const detailed = calculateHoldingsDetails(holdings, quotes);
    return calculateAccountMetrics(cash, detailed);
  }, [cash, holdings, quotes]);

  const isProfit = metrics.unrealizedPnL >= 0;
  const pnlPercent = metrics.holdingsValue > 0 
    ? (metrics.unrealizedPnL / (metrics.holdingsValue - metrics.unrealizedPnL)) * 100 
    : 0;

  return (
    <section className="summary-strip" aria-label="Account Summary">
      {/* Available Cash */}
      <div className="summary-metric">
        <span className="metric-label">Available Cash</span>
        <span className="metric-value font-mono">{formatCurrency(metrics.cash)}</span>
      </div>

      <div className="metric-divider" aria-hidden="true"></div>

      {/* Holdings Value */}
      <div className="summary-metric">
        <span className="metric-label">Holdings Value</span>
        <span className="metric-value font-mono">{formatCurrency(metrics.holdingsValue)}</span>
      </div>

      <div className="metric-divider" aria-hidden="true"></div>

      {/* Total Equity */}
      <div className="summary-metric">
        <span className="metric-label">Total Equity</span>
        <span className="metric-value font-mono">{formatCurrency(metrics.equity)}</span>
      </div>

      <div className="metric-divider" aria-hidden="true"></div>

      {/* Unrealised P&L */}
      <div className="summary-metric">
        <span className="metric-label">Unrealised P&L</span>
        <span className={`metric-value font-mono ${metrics.unrealizedPnL === 0 ? '' : isProfit ? 'profit' : 'loss'}`}>
          {formatCurrency(metrics.unrealizedPnL, true)}
          {metrics.holdingsValue > 0 && ` (${formatPercent(pnlPercent)})`}
        </span>
      </div>
    </section>
  );
}
