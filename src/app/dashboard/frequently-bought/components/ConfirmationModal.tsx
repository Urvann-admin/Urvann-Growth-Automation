'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

interface ConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  variant?: 'default' | 'danger';
}

export default function ConfirmationModal({
  open,
  onOpenChange,
  title,
  message,
  confirmText = 'OK',
  cancelText = 'Cancel',
  onConfirm,
  variant = 'default',
}: ConfirmationModalProps) {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-in fade-in" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#282C34] text-white rounded-xl shadow-2xl z-50 w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
          <Dialog.Title className="text-lg font-semibold text-white mb-3">
            {title}
          </Dialog.Title>
          <Dialog.Description className="text-slate-300 mb-6 leading-relaxed text-sm">
            {message}
          </Dialog.Description>
          
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 text-sm font-medium text-white bg-[#1B6D6D] hover:bg-[#155a5a] rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#1B6D6D] focus:ring-offset-2 focus:ring-offset-[#282C34]"
            >
              {cancelText}
            </button>
            <button
              onClick={handleConfirm}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#282C34] ${
                variant === 'danger'
                  ? 'bg-red-600 hover:bg-red-500 focus:ring-red-500'
                  : 'bg-[#70D0E8] hover:bg-[#5bb8d0] focus:ring-[#70D0E8]'
              }`}
            >
              {confirmText}
            </button>
          </div>
          
          <Dialog.Close asChild>
            <button
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 rounded"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

