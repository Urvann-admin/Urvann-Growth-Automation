'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Category Master route: redirects to the main Listing page with Category Master tab selected.
 * The form lives in the tab content on the listing page to keep the same sidebar layout.
 */
export default function CategoryMasterPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/listing#category-master');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[200px] text-slate-500 text-sm">
      Redirecting to Category Master...
    </div>
  );
}
