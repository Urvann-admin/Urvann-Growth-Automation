'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { storage } from '@/shared/utils';
import { STORAGE_KEYS } from '@/shared/constants';
import type { AuthUser } from '@/shared/types/api';

export default function RealtimeOrdersRedirectPage() {
  const router = useRouter();
  const hasRedirected = useRef(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // Prevent double execution
    if (hasRedirected.current || isRedirecting) {
      return;
    }

    const RETURN_FLAG = 'returning_from_realtime_dashboard';
    const BACK_TO_DASHBOARD_FLAG = 'returning_to_dashboard';
    const REDIRECT_IN_PROGRESS_FLAG = 'realtime_redirect_in_progress';
    const externalUrl = 'http://13.235.242.169:5001/dashboard/realtime-orders';

    // Check if we're returning from external dashboard
    const wasAtExternal = sessionStorage.getItem(RETURN_FLAG) === 'true';
    
    // Check if redirect is already in progress (prevents double redirects)
    const redirectInProgress = sessionStorage.getItem(REDIRECT_IN_PROGRESS_FLAG) === 'true';

    console.log('RealtimeOrdersRedirectPage: wasAtExternal:', wasAtExternal);
    console.log('RealtimeOrdersRedirectPage: redirectInProgress:', redirectInProgress);

    if (wasAtExternal) {
      console.log('RealtimeOrdersRedirectPage: Returning to dashboard');
      sessionStorage.removeItem(RETURN_FLAG);
      sessionStorage.removeItem(REDIRECT_IN_PROGRESS_FLAG);
      sessionStorage.setItem(BACK_TO_DASHBOARD_FLAG, 'true');
      hasRedirected.current = true;
      setIsRedirecting(true);
      router.replace('/dashboard');
      return;
    }

    // If redirect is already in progress, don't redirect again
    if (redirectInProgress) {
      console.log('RealtimeOrdersRedirectPage: Redirect already in progress, waiting...');
      return;
    }

    console.log('RealtimeOrdersRedirectPage: Redirecting to external site');
    
    // Mark redirect as in progress
    sessionStorage.setItem(REDIRECT_IN_PROGRESS_FLAG, 'true');
    sessionStorage.setItem(RETURN_FLAG, 'true');
    hasRedirected.current = true;
    setIsRedirecting(true);
    
    // Get user email from localStorage to pass via URL (for cross-origin access)
    const storedUser = storage.get<AuthUser>(STORAGE_KEYS.user);
    const userEmail = storedUser?.email || '';
    
    if (!userEmail) {
      console.error('RealtimeOrdersRedirectPage: No user email found, redirecting to dashboard');
      sessionStorage.removeItem(REDIRECT_IN_PROGRESS_FLAG);
      sessionStorage.removeItem(RETURN_FLAG);
      router.replace('/dashboard');
      return;
    }
    
    // Pass return URL and user email as query parameters
    const returnUrl = encodeURIComponent(`${window.location.origin}/dashboard/realtime-orders`);
    const params = new URLSearchParams({
      returnUrl: returnUrl,
      email: userEmail, // Pass email for cross-origin localStorage issue
    });
    const externalUrlWithParams = `${externalUrl}?${params.toString()}`;
    
    console.log('RealtimeOrdersRedirectPage: Redirecting with email:', userEmail);
    
    // Use setTimeout to ensure state updates before redirect
    setTimeout(() => {
      window.location.href = externalUrlWithParams;
    }, 100);

    // Cleanup function to handle component unmount (e.g., back button)
    return () => {
      // Clear redirect in progress flag after a delay if we're still on this page
      // This handles the case where user presses back before redirect completes
      const timeoutId = setTimeout(() => {
        if (window.location.pathname === '/dashboard/realtime-orders') {
          console.log('RealtimeOrdersRedirectPage: Still on redirect page after timeout, clearing flags');
          sessionStorage.removeItem(REDIRECT_IN_PROGRESS_FLAG);
        }
      }, 2000);
      
      return () => clearTimeout(timeoutId);
    };
  }, [router, isRedirecting]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-3 border-emerald-500 border-t-transparent"></div>
        <p className="text-slate-600 text-sm">Redirecting to Real-Time Dashboard...</p>
      </div>
    </div>
  );
}

