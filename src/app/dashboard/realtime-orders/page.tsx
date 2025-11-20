'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RealtimeOrdersRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // This page should not be used anymore since we do direct redirects
    // If someone lands here, redirect them back to dashboard
    console.log('RealtimeOrdersRedirectPage: This page is deprecated, redirecting to dashboard');
    router.replace('/dashboard');
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

