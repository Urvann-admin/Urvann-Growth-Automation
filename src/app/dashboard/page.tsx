'use client';

import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/Button";
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useEffect, useState } from 'react';

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    console.log('Dashboard - user:', user);
    console.log('Dashboard - user role:', user?.role);
    
    if (!user) {
      console.log('No user, redirecting to login');
      router.push('/auth/login');
    } else {
      console.log('User found, setting loading to false');
      setLoading(false);
    }
  }, [user, router]);
  
  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Container */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 shadow-lg">
        <div className="px-6 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Dashboard</h1>
                <p className="text-blue-100 text-sm mt-1">Welcome to Urvann Growth Management</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors duration-200"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">

        {/* Dashboard Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Growth Metrics Container */}
          <div 
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push('/dashboard/growth-analytics')}
          >
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Growth Metrics</h3>
                <p className="text-sm text-gray-600">Track your growth</p>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">+24.5%</div>
            <div className="text-sm text-green-600">vs last month</div>
          </div>

          {/* User Management Container - Only for Admin/Manager */}
          {(user.role === 'admin' || user.role === 'manager') && (
            <div 
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => router.push('/dashboard/user-management')}
            >
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">User Management</h3>
                  <p className="text-sm text-gray-600">Manage team members</p>
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {user.role === 'admin' ? 'Admin' : 'Manager'}
              </div>
              <div className="text-sm text-blue-600">Access Level</div>
            </div>
          )}

          {/* Real Time Dashboard Container */}
          <div 
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => {
              // Open the real-time dashboard with credentials as URL parameters
              const baseUrl = 'http://13.200.250.221/realtime-orders';
              const params = new URLSearchParams({
                email: user.email,
                password: 'admin123'
              });
              const urlWithParams = `${baseUrl}?${params.toString()}`;
              window.open(urlWithParams, '_blank');
            }}
          >
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Real Time Dashboard</h3>
                <p className="text-sm text-gray-600">Live order tracking</p>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">Live</div>
            <div className="text-sm text-orange-600">Real-time data</div>
          </div>

        </div>
      </div>
    </div>
  );
}
