/**
 * Formatting utilities for financial precision and dates
 */

export function formatCurrency(amount, showSign = false) {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return '$0.00';
  const prefix = showSign && amount > 0 ? '+' : '';
  const formatted = Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${amount < 0 ? '-' : prefix}$${formatted}`;
}

export function formatPrice(price, decimals = 2) {
  if (price === null || price === undefined || !Number.isFinite(price)) return '---';
  return Number(price).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatQuantity(qty, decimals = 4) {
  if (qty === null || qty === undefined || !Number.isFinite(qty)) return '0';
  return Number(qty).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

export function formatPercent(value, showSign = true) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '0.00%';
  const sign = showSign && value > 0 ? '+' : '';
  return `${sign}${Number(value).toFixed(2)}%`;
}

export function formatDateTime(timestamp) {
  if (!timestamp) return '--/-- --:--';
  const d = new Date(timestamp);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatTime(timestamp) {
  if (!timestamp) return '--:--:--';
  const d = new Date(timestamp);
  return d.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
