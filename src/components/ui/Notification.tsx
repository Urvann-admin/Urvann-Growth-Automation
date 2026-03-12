'use client';

import { X } from 'lucide-react';
import { cn } from '@/shared/utils';

export interface NotificationProps {
  type: 'success' | 'error' | 'info';
  text: string;
  onDismiss: () => void;
}

const typeStyles = {
  success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
};

export function Notification({ type, text, onDismiss }: NotificationProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex items-center justify-between gap-3 rounded-lg border px-4 py-3',
        typeStyles[type]
      )}
    >
      <p className="text-sm font-medium">{text}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 rounded p-1 opacity-70 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
