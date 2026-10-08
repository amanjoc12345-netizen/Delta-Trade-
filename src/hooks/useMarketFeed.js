/**
 * useMarketFeed Custom Hook
 * Streams real live cryptocurrency market data directly from Binance.
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
  const activeSymbolRef = useRef(DEFAULT_INSTRUMENT.id);
  const activeIntervalRef = useRef('5m');

  // Keep refs in sync with active instrument and interval
  useEffect(() => {
    activeSymbolRef.current = selectedInstrument.id;
    activeIntervalRef.current = selectedInterval;
  }, [selectedInstrument.id, selectedInterval]);

  // Fetch initial real 24h ticker data for all 5 pairs from Binance
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

  // Load Real Historical Candles when instrument or interval changes
  useEffect(() => {
    let isCancelled = false;
    const currentReqId = ++requestIdRef.current;
    const sym = selectedInstrument.id;
    const interval = selectedInterval;

    const loadHistory = async () => {
      try {
        const data = await binanceProvider.fetchCandles(sym, interval, 100);
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
      // Strictly ignore ticks that do not match the currently active symbol and timeframe
      if (candleSymbol && candleSymbol !== sym) return;
      if (candleInterval && candleInterval !== interval) return;

      setCandleState(prev => {
        // Double check matching state
        if (prev.symbol !== sym || prev.interval !== interval) {
          return prev;
        }

        const prevData = prev.data;
        // Don't inject isolated live candle before historical data has arrived
        if (!prevData || prevData.length === 0) {
          return prev;
        }

        const last = prevData[prevData.length - 1];

        if (last.time === candle.time) {
          const updated = [...prevData];
          updated[updated.length - 1] = candle;
          return { ...prev, data: updated };
        } else if (candle.time > last.time) {
          return { ...prev, data: [...prevData.slice(-150), candle] };
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
  };
}
