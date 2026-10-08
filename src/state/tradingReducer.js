/**
 * Trading Reducer for Spot Account State
 */

import { executeBuy, executeSell } from '../utils/accounting.js';
import { INITIAL_ACCOUNT_CASH } from '../utils/instruments.js';
import { storage } from '../utils/storage.js';

export const initialTradingState = {
  cash: INITIAL_ACCOUNT_CASH,
  holdings: {},
  history: [],
  lastAction: null,
};

export function tradingReducer(state, action) {
  switch (action.type) {
    case 'RESTORE_STATE': {
      return {
        ...state,
        ...action.payload,
      };
    }

    case 'BUY_ORDER': {
      const { symbol, quantity, price } = action.payload;
      const { nextState, trade } = executeBuy(state, {
        symbol,
        quantity,
        price,
        timestamp: Date.now(),
      });
      storage.saveAccountState(nextState);
      return {
        ...nextState,
        lastAction: { type: 'BUY_SUCCESS', trade },
      };
    }

    case 'SELL_ORDER': {
      const { symbol, quantity, price, allowShort = true } = action.payload;
      const { nextState, trade } = executeSell(state, {
        symbol,
        quantity,
        price,
        allowShort,
        timestamp: Date.now(),
      });
      storage.saveAccountState(nextState);
      return {
        ...nextState,
        lastAction: { type: 'SELL_SUCCESS', trade },
      };
    }

    case 'RESET_ACCOUNT': {
      const reset = storage.resetAccountState();
      return {
        ...initialTradingState,
        ...reset,
        lastAction: { type: 'ACCOUNT_RESET' },
      };
    }

    default:
      return state;
  }
}
