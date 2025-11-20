'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { storage } from '@/shared/utils';
import { STORAGE_KEYS } from '@/shared/constants';
import type { AuthUser } from '@/shared/types/api';

export default function RealtimeOrdersRedirectPage() {
  const router = useRouter();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (hasRedirected.current) {
      return;
    }

    const RETURN_FLAG = 'returning_from_realtime_dashboard';
    const BACK_TO_DASHBOARD_FLAG = 'returning_to_dashboard';
    const externalUrl = 'http://13.235.242.169:5001/dashboard/realtime-orders';

    const wasAtExternal = sessionStorage.getItem(RETURN_FLAG) === 'true';

    console.log('RealtimeOrdersRedirectPage: wasAtExternal:', wasAtExternal);

    if (wasAtExternal) {
      console.log('RealtimeOrdersRedirectPage: Returning to dashboard');
      sessionStorage.removeItem(RETURN_FLAG);
      sessionStorage.setItem(BACK_TO_DASHBOARD_FLAG, 'true');
      hasRedirected.current = true;
      router.replace('/dashboard');
      return;
    }

    console.log('RealtimeOrdersRedirectPage: Redirecting to external site');
    sessionStorage.setItem(RETURN_FLAG, 'true');
    hasRedirected.current = true;
    
    // Get user email from localStorage to pass via URL (for cross-origin access)
    const storedUser = storage.get<AuthUser>(STORAGE_KEYS.user);
    const userEmail = storedUser?.email || '';
    
    // Pass return URL and user email as query parameters
    const returnUrl = encodeURIComponent(`${window.location.origin}/dashboard/realtime-orders`);
    const params = new URLSearchParams({
      returnUrl: returnUrl,
      email: userEmail, // Pass email for cross-origin localStorage issue
    });
    const externalUrlWithParams = `${externalUrl}?${params.toString()}`;
    
    console.log('RealtimeOrdersRedirectPage: Redirecting with email:', userEmail);
    window.location.href = externalUrlWithParams;
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-3 border-emerald-500 border-t-transparent"></div>
        <p className="text-slate-600 text-sm">Redirecting to Real-Time Dashboard...</p>
      </div>
    </div>
  );
}

