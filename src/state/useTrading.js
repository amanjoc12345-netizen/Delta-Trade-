import { useContext } from 'react';
import { TradingContext } from './TradingContext.jsx';

export function useTrading() {
  const ctx = useContext(TradingContext);
  if (!ctx) {
    throw new Error('useTrading must be used within a TradingProvider');
  }
  return ctx;
}
