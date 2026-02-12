'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Product route: redirects to the main Listing page with Product Master (Add Product) tab selected.
 */
export default function ProductPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/listing#product-add');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[200px] text-slate-500 text-sm">
      Redirecting to Product Master...
    </div>
  );
}
