/**
 * Versioned LocalStorage Service for Delta Trade
 */

import { INITIAL_ACCOUNT_CASH } from './instruments.js';

const STORAGE_KEY = 'DELTATRADE_STATE_V1';
const LEGACY_KEY = 'STREETDESK_STATE_V1';

export const storage = {
  loadAccountState() {
    try {
      const serialized = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_KEY);
      if (!serialized) return null;
      const data = JSON.parse(serialized);

      // Schema validation
      if (
        data &&
        typeof data === 'object' &&
        data.version === 1 &&
        typeof data.cash === 'number' &&
        data.holdings &&
        typeof data.holdings === 'object' &&
        Array.isArray(data.history)
      ) {
        return {
          cash: data.cash,
          holdings: data.holdings,
          history: data.history,
        };
      }
      return null;
    } catch {
      return null;
    }
  },

  saveAccountState({ cash, holdings, history }) {
    try {
      const payload = {
        version: 1,
        savedAt: Date.now(),
        cash,
        holdings,
        history,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {}
  },

  resetAccountState() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LEGACY_KEY);
    } catch {}
    return {
      cash: INITIAL_ACCOUNT_CASH,
      holdings: {},
      history: [],
    };
  },
};
