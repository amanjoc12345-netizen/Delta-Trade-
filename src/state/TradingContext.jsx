import React, { createContext, useReducer, useEffect, useState, useCallback } from 'react';
import { tradingReducer, initialTradingState } from './tradingReducer.js';
import { storage } from '../utils/storage.js';

const TradingContext = createContext(null);

export function TradingProvider({ children }) {
  const [state, dispatch] = useReducer(tradingReducer, initialTradingState);
  const [toasts, setToasts] = useState([]);

  // Restore persisted state on mount
  useEffect(() => {
    const saved = storage.loadAccountState();
    if (saved) {
      dispatch({ type: 'RESTORE_STATE', payload: saved });
    }
  }, []);

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 5);
    const newToast = { id, timestamp: Date.now(), ...toast };
    setToasts((prev) => [newToast, ...prev.slice(0, 3)]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const buyOrder = useCallback(({ symbol, quantity, price }) => {
    try {
      dispatch({ type: 'BUY_ORDER', payload: { symbol, quantity, price } });
      addToast({
        type: 'success',
        title: 'Order Executed',
        message: `Bought ${quantity} ${symbol} @ $${price.toLocaleString()}`,
      });
      return { success: true };
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Order Failed',
        message: err.message,
      });
      return { success: false, error: err.message };
    }
  }, [addToast]);

  const sellOrder = useCallback(({ symbol, quantity, price, allowShort = true }) => {
    try {
      dispatch({ type: 'SELL_ORDER', payload: { symbol, quantity, price, allowShort } });
      addToast({
        type: 'success',
        title: 'Order Executed',
        message: `Sold ${quantity} ${symbol} @ $${price.toLocaleString()}`,
      });
      return { success: true };
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Order Failed',
        message: err.message,
      });
      return { success: false, error: err.message };
    }
  }, [addToast]);

  const resetAccount = useCallback(() => {
    dispatch({ type: 'RESET_ACCOUNT' });
    addToast({
      type: 'info',
      title: 'Demo Account Reset',
      message: 'Restored 10,000 USDT balance and cleared trading history.',
    });
  }, [addToast]);

  const value = {
    cash: state.cash,
    holdings: state.holdings,
    history: state.history,
    buyOrder,
    sellOrder,
    resetAccount,
    toasts,
    removeToast,
  };

  return <TradingContext.Provider value={value}>{children}</TradingContext.Provider>;
}

export { TradingContext };
