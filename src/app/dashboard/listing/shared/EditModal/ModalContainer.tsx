'use client';

import { ReactNode } from 'react';

interface ModalContainerProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Optional class for the inner content wrapper (e.g. max-w-6xl for wider modals) */
  contentClassName?: string;
}

export function ModalContainer({ isOpen, onClose, children, contentClassName }: ModalContainerProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`relative flex flex-col w-full max-h-[88vh] rounded-xl border border-slate-200 bg-white shadow-2xl ${contentClassName ?? 'max-w-3xl'}`}>
        {children}
      </div>
    </div>
  );
}
