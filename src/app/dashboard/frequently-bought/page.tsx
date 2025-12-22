'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth';

export default function FrequentlyBoughtPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/auth/login');
      return;
    }
    // Only admins can access frequently bought products
    if (user.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
    // Redirect to analysis page by default
    router.replace('/dashboard/frequently-bought/analysis');
  }, [user, authLoading, router]);

  return null;
}
