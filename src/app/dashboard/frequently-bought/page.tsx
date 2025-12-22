'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth';

export default function FrequentlyBoughtPage() {
  const router = useRouter();
  const { isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading) {
      // Redirect to analysis page by default
      router.replace('/dashboard/frequently-bought/analysis');
    }
  }, [authLoading, router]);

  return null;
}
