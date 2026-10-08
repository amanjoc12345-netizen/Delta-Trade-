/**
 * useMarketFeed Custom Hook
 * Streams real live cryptocurrency market data directly from Binance.
 * Manages deep historical candle bars (500 initial, up to 1000) and seamless pagination.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { INSTRUMENTS, DEFAULT_INSTRUMENT } from '../utils/instruments.js';
import { binanceProvider } from '../services/binanceProvider.js';

export function useMarketFeed() {
  const [selectedInstrument, setSelectedInstrument] = useState(DEFAULT_INSTRUMENT);
  const [selectedInterval, setSelectedInterval] = useState('5m');
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [quotes, setQuotes] = useState({});
  const [candleState, setCandleState] = useState({
    symbol: DEFAULT_INSTRUMENT.id,
    interval: '5m',
    data: [],
  });
  const [candleError, setCandleError] = useState(null);

  const requestIdRef = useRef(0);
  const isLoadingMoreRef = useRef(false);
  const activeSymbolRef = useRef(DEFAULT_INSTRUMENT.id);
  const activeIntervalRef = useRef('5m');

  // Keep refs in sync with active instrument and interval
  useEffect(() => {
    activeSymbolRef.current = selectedInstrument.id;
    activeIntervalRef.current = selectedInterval;
  }, [selectedInstrument.id, selectedInterval]);

  // Fetch initial real 24h ticker data for all pairs from Binance
  useEffect(() => {
    let isCancelled = false;

    const loadInitialTickers = async () => {
      try {
        const all = await binanceProvider.fetchAllTickers();
        if (!isCancelled && all && Object.keys(all).length > 0) {
          setQuotes(prev => ({ ...prev, ...all }));
        }
      } catch {}
    };

    loadInitialTickers();

    return () => {
      isCancelled = true;
    };
  }, []);

  // Load Deep Real Historical Candles (500 bars) when instrument or interval changes
  useEffect(() => {
    let isCancelled = false;
    const currentReqId = ++requestIdRef.current;
    const sym = selectedInstrument.id;
    const interval = selectedInterval;

    const loadHistory = async () => {
      try {
        const data = await binanceProvider.fetchCandles(sym, interval, 500);
        if (!isCancelled && currentReqId === requestIdRef.current) {
          setCandleState({
            symbol: sym,
            interval: interval,
            data,
          });
          setCandleError(null);
        }
      } catch {
        if (!isCancelled && currentReqId === requestIdRef.current) {
          setCandleError('Connecting to live market chart...');
        }
      }
    };

    loadHistory();

    return () => {
      isCancelled = true;
    };
  }, [selectedInstrument.id, selectedInterval]);

  // Paginated load of older historical candles when scrolled to the left
  const loadMoreHistory = useCallback(async () => {
    if (isLoadingMoreRef.current) return;
    const currentData = candleState.data;
    if (!currentData || currentData.length === 0) return;

    const oldest = currentData[0];
    const oldestMs = oldest.time * 1000;
    const sym = selectedInstrument.id;
    const interval = selectedInterval;

    try {
      isLoadingMoreRef.current = true;
      const olderCandles = await binanceProvider.fetchCandles(sym, interval, 300, oldestMs - 1);
      if (olderCandles && olderCandles.length > 0) {
        setCandleState(prev => {
          if (prev.symbol !== sym || prev.interval !== interval) return prev;
          const existingTimes = new Set(prev.data.map(c => c.time));
          const uniqueOlder = olderCandles.filter(c => !existingTimes.has(c.time));
          if (uniqueOlder.length === 0) return prev;
          return {
            ...prev,
            data: [...uniqueOlder, ...prev.data],
          };
        });
      }
    } catch {
      // End of history reached or transient network issue
    } finally {
      isLoadingMoreRef.current = false;
    }
  }, [candleState.data, selectedInstrument.id, selectedInterval]);

  // Subscribe to Live Quotes & Candle ticks via Binance WebSocket
  useEffect(() => {
    const sym = selectedInstrument.id;
    const interval = selectedInterval;

    const onQuote = (quote) => {
      setQuotes(prev => ({
        ...prev,
        [quote.symbol]: {
          ...(prev[quote.symbol] || {}),
          ...quote,
        },
      }));
    };

    const onCandle = (candle, candleSymbol, candleInterval) => {
      if (candleSymbol && candleSymbol !== sym) return;
      if (candleInterval && candleInterval !== interval) return;

      setCandleState(prev => {
        if (prev.symbol !== sym || prev.interval !== interval) {
          return prev;
        }

        const prevData = prev.data;
        if (!prevData || prevData.length === 0) {
          return prev;
        }

        const last = prevData[prevData.length - 1];

        if (last.time === candle.time) {
          const updated = [...prevData];
          updated[updated.length - 1] = candle;
          return { ...prev, data: updated };
        } else if (candle.time > last.time) {
          return { ...prev, data: [...prevData.slice(-1000), candle] };
        }
        return prev;
      });
    };

    const onStatus = ({ status }) => {
      setConnectionStatus(status);
    };

    const unsubscribe = binanceProvider.subscribe(
      sym,
      interval,
      onQuote,
      onCandle,
      onStatus
    );

    return () => {
      unsubscribe();
    };
  }, [selectedInstrument.id, selectedInterval]);

  const selectInstrumentById = useCallback((id) => {
    const found = INSTRUMENTS.find(i => i.id === id);
    if (found) setSelectedInstrument(found);
  }, []);

  const currentQuote = useMemo(() => {
    return quotes[selectedInstrument.id] || {
      symbol: selectedInstrument.id,
      price: selectedInstrument.basePrice,
      bid: selectedInstrument.basePrice * (1 - selectedInstrument.spreadPct / 2),
      ask: selectedInstrument.basePrice * (1 + selectedInstrument.spreadPct / 2),
      spread: selectedInstrument.basePrice * selectedInstrument.spreadPct,
      change24h: 0,
      timestamp: 0,
    };
  }, [quotes, selectedInstrument]);

  // Only pass candles if they belong to the currently selected symbol and interval
  const isCandleStale = candleState.symbol !== selectedInstrument.id || candleState.interval !== selectedInterval;
  const activeCandles = !isCandleStale ? candleState.data : [];
  const isLoadingCandles = isCandleStale && !candleError;

  return {
    instruments: INSTRUMENTS,
    selectedInstrument,
    selectInstrument: selectInstrumentById,
    selectedInterval,
    setSelectedInterval,
    connectionStatus,
    quotes,
    currentQuote,
    candles: activeCandles,
    isLoadingCandles,
    candleError,
    loadMoreHistory,
  };
}
