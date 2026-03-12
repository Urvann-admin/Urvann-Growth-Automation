'use client';

import { useEffect } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

export interface NotificationProps {
  type: 'success' | 'error';
  text: string;
  onDismiss: () => void;
  autoDismissMs?: number;
}

export function Notification({
  type,
  text,
  onDismiss,
  autoDismissMs = 5000,
}: NotificationProps) {
  useEffect(() => {
    if (autoDismissMs <= 0) return;
    const t = setTimeout(onDismiss, autoDismissMs);
    return () => clearTimeout(t);
  }, [autoDismissMs, onDismiss]);

  const isSuccess = type === 'success';

  return (
    <div
      role="alert"
      className="fixed top-4 right-4 z-[200] flex w-full max-w-sm items-start gap-3 rounded-xl border shadow-lg"
      style={{
        background: isSuccess ? 'rgb(236 253 245)' : 'rgb(254 242 242)',
        borderColor: isSuccess ? 'rgb(167 243 208)' : 'rgb(254 202 202)',
      }}
    >
      <span className="shrink-0 pt-3.5 pl-3" aria-hidden>
        {isSuccess ? (
          <CheckCircle className="h-5 w-5 text-emerald-600" />
        ) : (
          <XCircle className="h-5 w-5 text-red-600" />
        )}
      </span>
      <p
        className="flex-1 py-3 pr-2 text-sm font-medium"
        style={{ color: isSuccess ? 'rgb(4 120 87)' : 'rgb(185 28 28)' }}
      >
        {text}
      </p>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 rounded p-2 opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-1"
        style={{ color: isSuccess ? 'rgb(4 120 87)' : 'rgb(185 28 28)' }}
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
