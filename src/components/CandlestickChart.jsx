import React, { useEffect, useRef, useState } from 'react';
import { createChart, CandlestickSeries, ColorType, CrosshairMode, LineStyle } from 'lightweight-charts';
import { TIMEFRAMES } from '../utils/instruments.js';
import { formatPrice, formatPercent, formatQuantity, formatDateTime } from '../utils/formatting.js';
import { AlertCircle, RefreshCw, Maximize2, Minimize2, X } from 'lucide-react';

export default function CandlestickChart({
  instrument,
  interval,
  onSelectInterval,
  candles,
  isLoading,
  error,
  quote,
  position,
  onClosePosition,
}) {
  const containerRef = useRef(null);
  const chartWrapperRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const positionLineRef = useRef(null);
  const lastDataKeyRef = useRef('');

  const [crosshairData, setCrosshairData] = useState(null);
  const [isChartFullscreen, setIsChartFullscreen] = useState(false);

  // Helper to read current theme colors
  const getThemeChartColors = () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    return isDark
      ? {
          bg: '#141b29',
          text: '#94a3b8',
          grid: 'rgba(255, 255, 255, 0.04)',
          border: 'rgba(255, 255, 255, 0.08)',
          up: '#10b981',
          down: '#ef4444',
        }
      : {
          bg: '#ffffff',
          text: '#475569',
          grid: 'rgba(0, 0, 0, 0.04)',
          border: '#e2e8f0',
          up: '#16a34a',
          down: '#dc2626',
        };
  };

  // Initialize TradingView Lightweight Chart once
  useEffect(() => {
    if (!containerRef.current) return;

    const colors = getThemeChartColors();

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: colors.bg },
        textColor: colors.text,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: colors.grid },
        horzLines: { color: colors.grid },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: colors.border,
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      timeScale: {
        borderColor: colors.border,
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: colors.up,
      downColor: colors.down,
      borderUpColor: colors.up,
      borderDownColor: colors.down,
      wickUpColor: colors.up,
      wickDownColor: colors.down,
      priceFormat: {
        type: 'price',
        precision: 2,
        minMove: 0.01,
      },
    });

    chartRef.current = chart;
    seriesRef.current = series;

    // Crosshair move handler
    chart.subscribeCrosshairMove((param) => {
      if (!param.point || !param.time || !param.seriesData.get(series)) {
        setCrosshairData(null);
      } else {
        const bar = param.seriesData.get(series);
        setCrosshairData(bar);
      }
    });

    // ResizeObserver
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length > 0 && chartRef.current) {
        const { width, height } = entries[0].contentRect;
        chartRef.current.applyOptions({ width, height });
      }
    });

    resizeObserver.observe(containerRef.current);

    // Observer for Theme Changes (data-theme attribute)
    const themeObserver = new MutationObserver(() => {
      if (!chartRef.current || !seriesRef.current) return;
      const themeColors = getThemeChartColors();
      chartRef.current.applyOptions({
        layout: {
          background: { type: ColorType.Solid, color: themeColors.bg },
          textColor: themeColors.text,
        },
        grid: {
          vertLines: { color: themeColors.grid },
          horzLines: { color: themeColors.grid },
        },
        rightPriceScale: { borderColor: themeColors.border },
        timeScale: { borderColor: themeColors.border },
      });
      seriesRef.current.applyOptions({
        upColor: themeColors.up,
        downColor: themeColors.down,
        borderUpColor: themeColors.up,
        borderDownColor: themeColors.down,
        wickUpColor: themeColors.up,
        wickDownColor: themeColors.down,
      });
    });

    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => {
      themeObserver.disconnect();
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      lastDataKeyRef.current = '';
    };
  }, []);

  const lastCandleCountRef = useRef(0);

  // Update Series Precision when instrument changes
  useEffect(() => {
    if (!seriesRef.current) return;
    seriesRef.current.applyOptions({
      priceFormat: {
        type: 'price',
        precision: instrument.decimals,
        minMove: 1 / Math.pow(10, instrument.decimals),
      },
    });
  }, [instrument.id, instrument.decimals]);

  // Sync Data to Chart safely without mixing instruments
  useEffect(() => {
    if (!seriesRef.current) return;

    // If candles are empty (e.g. while loading new instrument), clear chart canvas immediately
    if (!candles || candles.length === 0) {
      seriesRef.current.setData([]);
      lastDataKeyRef.current = '';
      lastCandleCountRef.current = 0;
      return;
    }

    const dataKey = `${instrument.id}_${interval}`;
    const isNewKey = lastDataKeyRef.current !== dataKey;
    const prevCount = lastCandleCountRef.current;
    const currentCount = candles.length;

    // Full historical reload if key changed, or if a multi-bar batch arrived
    const isFullBatch = isNewKey || prevCount <= 1 || Math.abs(currentCount - prevCount) > 1;

    if (isFullBatch) {
      seriesRef.current.setData(candles);
      lastDataKeyRef.current = dataKey;
      lastCandleCountRef.current = currentCount;
      if (chartRef.current) {
        chartRef.current.timeScale().fitContent();
      }
    } else {
      const latestBar = candles[candles.length - 1];
      seriesRef.current.update(latestBar);
      lastCandleCountRef.current = currentCount;
    }
  }, [candles, instrument.id, interval]);

  // Draw position price line on chart
  useEffect(() => {
    if (!seriesRef.current) return;

    if (positionLineRef.current) {
      try {
        seriesRef.current.removePriceLine(positionLineRef.current);
      } catch {}
      positionLineRef.current = null;
    }

    if (position && position.quantity > 0 && position.avgEntryPrice > 0) {
      try {
        const isShort = position.side === 'SELL';
        const curPrice = quote ? (quote.bid || quote.price) : position.avgEntryPrice;
        const isProfit = isShort ? curPrice <= position.avgEntryPrice : curPrice >= position.avgEntryPrice;
        const line = seriesRef.current.createPriceLine({
          price: position.avgEntryPrice,
          color: isProfit ? '#10b981' : '#f59e0b',
          lineWidth: 2,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `POS (${isShort ? 'SHORT' : 'BUY'}): ${formatQuantity(position.quantity, instrument.qtyDecimals)} ${instrument.baseAsset} @ $${formatPrice(position.avgEntryPrice, instrument.decimals)}`,
        });
        positionLineRef.current = line;
      } catch (err) {
        console.warn('Could not create position price line:', err);
      }
    }

    return () => {
      if (positionLineRef.current && seriesRef.current) {
        try {
          seriesRef.current.removePriceLine(positionLineRef.current);
        } catch {}
        positionLineRef.current = null;
      }
    };
  }, [position, instrument.id, instrument.decimals, instrument.qtyDecimals, instrument.baseAsset, quote]);

  const toggleChartFullscreen = () => {
    if (!chartWrapperRef.current) return;
    if (!document.fullscreenElement) {
      chartWrapperRef.current.requestFullscreen().catch(() => {});
      setIsChartFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsChartFullscreen(false);
    }
  };

  const activeBar = crosshairData || (candles && candles.length > 0 ? candles[candles.length - 1] : null);

  // Position live floating metrics
  const hasActivePosition = position && position.quantity > 0 && position.avgEntryPrice > 0;
  const isShort = hasActivePosition && position.side === 'SELL';
  const currentExecPrice = quote ? (quote.bid || quote.price) : (hasActivePosition ? position.avgEntryPrice : 0);
  const positionUnrealizedPnL = hasActivePosition
    ? (isShort
        ? position.quantity * (position.avgEntryPrice - currentExecPrice)
        : position.quantity * (currentExecPrice - position.avgEntryPrice))
    : 0;
  const positionCost = hasActivePosition ? (position.quantity * position.avgEntryPrice) : 0;
  const positionPnLPct = positionCost > 0 ? (positionUnrealizedPnL / positionCost) * 100 : 0;
  const isPosProfit = positionUnrealizedPnL >= 0;

  return (
    <section 
      ref={chartWrapperRef} 
      className={`workspace-panel chart-panel ${isChartFullscreen ? 'fullscreen-mode' : ''}`} 
      aria-label="Candlestick Chart"
    >
      {/* Chart Top Header */}
      <div className="chart-header">
        <div className="chart-title-area">
          <div className="symbol-quote-row">
            <span className="chart-symbol">{instrument.symbol}</span>
            <span className="chart-price font-mono">
              {quote ? formatPrice(quote.price, instrument.decimals) : '---'}
            </span>
            {quote && (
              <span className={`chart-change font-mono ${quote.change24h >= 0 ? 'pos' : 'neg'}`}>
                {formatPercent(quote.change24h)}
              </span>
            )}
          </div>
        </div>

        {/* Timeframe Selectors & Fullscreen */}
        <div className="chart-controls-group">
          <div className="timeframe-selector" role="group" aria-label="Chart timeframes">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.id}
                className={`tf-button ${interval === tf.id ? 'active' : ''}`}
                onClick={() => onSelectInterval(tf.id)}
                aria-pressed={interval === tf.id}
                id={`tf-${tf.id}`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          <button
            className="chart-fs-btn"
            onClick={toggleChartFullscreen}
            title={isChartFullscreen ? 'Exit Chart Fullscreen' : 'Expand Chart Fullscreen'}
            aria-label="Toggle Chart Fullscreen"
          >
            {isChartFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      </div>

      {/* OHLC Bar */}
      <div className="chart-ohlc-bar font-mono">
        {activeBar ? (
          <div className="ohlc-items">
            <span className="ohlc-time">{formatDateTime(activeBar.time * 1000)}</span>
            <span className="ohlc-stat">O: <strong className="val">{formatPrice(activeBar.open, instrument.decimals)}</strong></span>
            <span className="ohlc-stat">H: <strong className="val">{formatPrice(activeBar.high, instrument.decimals)}</strong></span>
            <span className="ohlc-stat">L: <strong className="val">{formatPrice(activeBar.low, instrument.decimals)}</strong></span>
            <span className="ohlc-stat">C: <strong className="val">{formatPrice(activeBar.close, instrument.decimals)}</strong></span>
          </div>
        ) : (
          <span className="ohlc-empty">Loading OHLC metrics...</span>
        )}
      </div>

      {/* Chart Canvas Area */}
      <div className="chart-canvas-wrapper">
        <div ref={containerRef} className="tv-chart-container" />

        {/* Active Open Position Floating HUD Banner */}
        {hasActivePosition && (
          <div className="chart-position-overlay-badge" role="region" aria-label="Open Position Details">
            <div className="pos-badge-left">
              <span className={`pos-type-tag ${isShort ? 'short' : ''}`}>
                {isShort ? 'SHORT POSITION' : 'LONG POSITION'}
              </span>
              <span className="pos-detail-item">
                <strong>{formatQuantity(position.quantity, instrument.qtyDecimals)} {instrument.baseAsset}</strong>
              </span>
              <span className="pos-detail-sep">•</span>
              <span className="pos-detail-item">
                Entry: <strong className="font-mono">${formatPrice(position.avgEntryPrice, instrument.decimals)}</strong>
              </span>
              <span className="pos-detail-sep">•</span>
              <span className={`pos-pnl-item font-mono ${isPosProfit ? 'pos' : 'neg'}`}>
                P&L: <strong>{isPosProfit ? '+' : ''}${formatPrice(Math.abs(positionUnrealizedPnL), 2)}</strong> ({formatPercent(positionPnLPct)})
              </span>
            </div>

            {onClosePosition && (
              <button
                className="pos-close-btn"
                onClick={() => onClosePosition(position)}
                title={`Close ${instrument.symbol} position at market price`}
                aria-label={`Close ${instrument.symbol} position`}
              >
                <X size={12} />
                <span>Close Position</span>
              </button>
            )}
          </div>
        )}

        {/* Loading Spinner */}
        {isLoading && (
          <div className="chart-overlay-message" aria-live="polite">
            <RefreshCw size={24} className="spin-icon" />
            <span>Loading live market candles...</span>
          </div>
        )}

        {/* Error Message */}
        {error && !isLoading && (!candles || candles.length === 0) && (
          <div className="chart-overlay-message error" aria-live="polite">
            <AlertCircle size={24} />
            <span>{error}</span>
          </div>
        )}
      </div>
    </section>
  );
}
