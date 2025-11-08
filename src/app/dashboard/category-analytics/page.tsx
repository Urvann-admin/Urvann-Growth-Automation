'use client';

import { Button } from "@/components/ui/Button";

export const dynamic = 'force-dynamic';

export default function CategoryAnalyticsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Category Analytics</h1>
              <p className="mt-2 text-gray-600">Detailed analysis of category performance</p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => window.history.back()}
            >
              Back to Dashboard
            </Button>
          </div>
        </div>

        {/* Category Analytics Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Category Analytics</h2>
            <p className="text-gray-600 mb-6">
              This page will contain detailed category analytics and insights.
            </p>
            <div className="text-sm text-gray-500">
              Coming soon - Advanced analytics features
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}










