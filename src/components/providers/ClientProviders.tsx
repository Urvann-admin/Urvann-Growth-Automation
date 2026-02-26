'use client';

import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/features/auth/hooks/useAuth';

interface ClientProvidersProps {
  children: React.ReactNode;
}

export function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <AuthProvider>
      {children}
      <Toaster position="top-right" />
    </AuthProvider>
  );
}
