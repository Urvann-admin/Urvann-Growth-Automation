'use client';

import { X } from 'lucide-react';

interface ModalHeaderProps {
  title: string;
  onClose: () => void;
}

export function ModalHeader({ title, onClose }: ModalHeaderProps) {
  return (
    <div className="flex items-center justify-between shrink-0 border-b border-slate-200 bg-slate-50/80 px-6 py-4 rounded-t-xl">
      <h2 id="edit-modal-title" className="text-lg font-semibold text-slate-900">
        {title}
      </h2>
      <button
        type="button"
        onClick={onClose}
        className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
        aria-label="Close"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}
