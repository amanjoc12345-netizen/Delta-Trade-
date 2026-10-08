import React from 'react';
import { useTrading } from '../state/useTrading.js';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export default function ToastContainer() {
  const { toasts, removeToast } = useTrading();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-portal" role="region" aria-label="Notifications" aria-live="polite">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';

        return (
          <div key={toast.id} className={`toast-item ${toast.type}`}>
            <div className="toast-icon">
              {isSuccess && <CheckCircle2 size={16} className="t-icon success" />}
              {isError && <AlertTriangle size={16} className="t-icon error" />}
              {!isSuccess && !isError && <Info size={16} className="t-icon info" />}
            </div>

            <div className="toast-text-area">
              <span className="toast-title">{toast.title}</span>
              <span className="toast-message">{toast.message}</span>
            </div>

            <button
              className="toast-close-btn"
              onClick={() => removeToast(toast.id)}
              aria-label="Dismiss notification"
            >
              <X size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
