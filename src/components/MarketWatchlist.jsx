import React from 'react';
import { formatPrice, formatPercent } from '../utils/formatting.js';
import { ArrowUpRight, ArrowDownRight, Layers } from 'lucide-react';

export default function MarketWatchlist({
  instruments,
  selectedInstrument,
  onSelectInstrument,
  quotes,
}) {
  return (
    <aside className="workspace-panel watchlist-panel" aria-label="Market Watchlist">
      <div className="panel-header">
        <div className="panel-title-group">
          <Layers size={14} className="panel-icon" aria-hidden="true" />
          <h2 className="panel-title">Watchlist</h2>
        </div>
        <span className="count-pill font-mono">{instruments.length} Pairs</span>
      </div>

      <div className="watchlist-list" role="list">
        {instruments.map(inst => {
          const isSelected = selectedInstrument.id === inst.id;
          const q = quotes[inst.id] || {
            price: inst.basePrice,
            bid: inst.basePrice * 0.9998,
            ask: inst.basePrice * 1.0002,
            change24h: 0,
            tickDirection: 'neutral',
          };

          const isPositive = q.change24h >= 0;
          const flashClass = q.tickDirection === 'up' 
            ? 'tick-flash-up' 
            : q.tickDirection === 'down' 
            ? 'tick-flash-down' 
            : '';

          return (
            <button
              key={inst.id}
              className={`watchlist-item ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelectInstrument(inst.id)}
              role="listitem"
              aria-selected={isSelected}
              id={`watchlist-${inst.id.toLowerCase()}`}
            >
              {/* Symbol & Name */}
              <div className="item-symbol-col">
                <span className="inst-symbol">{inst.symbol}</span>
                <span className="inst-name">{inst.name}</span>
              </div>

              {/* Price & Spread */}
              <div className={`item-price-col ${flashClass}`}>
                <span className="inst-price font-mono">
                  {formatPrice(q.price, inst.decimals)}
                </span>
                <div className="bidask-row font-mono">
                  <span className="bid-val">B: {formatPrice(q.bid, inst.decimals)}</span>
                  <span className="ask-val">A: {formatPrice(q.ask, inst.decimals)}</span>
                </div>
              </div>

              {/* 24h Change */}
              <div className="item-change-col">
                <span className={`change-badge font-mono ${isPositive ? 'pos' : 'neg'}`}>
                  {isPositive ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                  {formatPercent(q.change24h)}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
