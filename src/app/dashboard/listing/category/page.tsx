'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Category route: redirects to the main Listing page with Category tab selected.
 * The form lives in the tab content on the listing page to keep the same sidebar layout.
 */
export default function CategoryPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/listing#category-add');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[200px] text-slate-500 text-sm">
      Redirecting to Category...
    </div>
  );
}
