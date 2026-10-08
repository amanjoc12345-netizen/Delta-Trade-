import React, { useState } from 'react';
import { Briefcase, History } from 'lucide-react';
import PositionsTable from './PositionsTable.jsx';
import TradeHistory from './TradeHistory.jsx';

export default function BottomDock({
  holdings,
  history,
  quotes,
  onSelectInstrument,
  onClosePosition,
}) {
  const [activeTab, setActiveTab] = useState('positions'); // 'positions' | 'history'

  const holdingsCount = Object.keys(holdings || {}).length;
  const historyCount = (history || []).length;

  return (
    <section className="workspace-panel bottom-dock" aria-label="Portfolio and History">
      {/* Dock Tabs Header */}
      <div className="dock-header">
        <div className="dock-tabs" role="tablist">
          <button
            className={`dock-tab ${activeTab === 'positions' ? 'active' : ''}`}
            onClick={() => setActiveTab('positions')}
            role="tab"
            aria-selected={activeTab === 'positions'}
            id="tab-positions"
          >
            <Briefcase size={14} aria-hidden="true" />
            <span>Open Positions</span>
            <span className="dock-badge font-mono">{holdingsCount}</span>
          </button>

          <button
            className={`dock-tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
            role="tab"
            aria-selected={activeTab === 'history'}
            id="tab-history"
          >
            <History size={14} aria-hidden="true" />
            <span>Trade History</span>
            <span className="dock-badge font-mono">{historyCount}</span>
          </button>
        </div>
      </div>

      {/* Dock Body */}
      <div 
        className="dock-content" 
        role="tabpanel" 
        aria-labelledby={activeTab === 'positions' ? 'tab-positions' : 'tab-history'}
      >
        {activeTab === 'positions' ? (
          <PositionsTable
            holdings={holdings}
            quotes={quotes}
            onSelectInstrument={onSelectInstrument}
            onClosePosition={onClosePosition}
          />
        ) : (
          <TradeHistory history={history} />
        )}
      </div>
    </section>
  );
}
