'use client';

import { AddInvoiceFormModal } from './AddInvoiceFormModal';

interface AddInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddInvoiceModal({ isOpen, onClose, onSuccess }: AddInvoiceModalProps) {
  return (
    <AddInvoiceFormModal
      isOpen={isOpen}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}
