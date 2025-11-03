'use client';

import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/Button";
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useEffect, useState } from 'react';
import { TrendingUp, Users, Activity, LogOut, TreeDeciduous, Sprout } from 'lucide-react';

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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-3 border-emerald-500 border-t-transparent"></div>
          <p className="text-slate-600 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center shadow-md">
                <TreeDeciduous className="w-6 h-6 text-white" strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-slate-900">
                  Dashboard
                </h1>
                <p className="text-slate-500 text-xs">Urvann Growth Management</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200">
                <div className="w-7 h-7 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                  {user.email?.charAt(0).toUpperCase()}
                </div>
                <div className="text-xs">
                  <p className="font-medium text-slate-900">{user.email}</p>
                  <p className="text-[10px] text-emerald-600 capitalize">{user.role}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all font-medium text-xs"
              >
                <LogOut className="w-3.5 h-3.5 mr-1.5" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 px-6">
        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Growth Metrics Card */}
          <div 
            className="group bg-gradient-to-br from-emerald-50/50 to-green-50/30 rounded-xl shadow-sm border border-emerald-100 p-5 cursor-pointer hover:shadow-md hover:border-emerald-200 transition-all duration-200"
            onClick={() => router.push('/dashboard/growth-analytics')}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-11 h-11 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                <TrendingUp className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
            </div>
            <h3 className="text-base font-semibold text-slate-900 mb-0.5">Growth Metrics</h3>
            <p className="text-xs text-slate-600 mb-3">Track your growth</p>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-2xl font-bold text-slate-900">+24.5%</div>
                <div className="text-xs text-emerald-600 font-medium flex items-center mt-0.5">
                  <Sprout className="w-3 h-3 mr-0.5" />
                  vs last month
                </div>
              </div>
              <svg className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>

          {/* User Management Card - Only for Admin/Manager */}
          {(user.role === 'admin' || user.role === 'manager') && (
            <div 
              className="group bg-gradient-to-br from-indigo-50/50 to-purple-50/30 rounded-xl shadow-sm border border-indigo-100 p-5 cursor-pointer hover:shadow-md hover:border-indigo-200 transition-all duration-200"
              onClick={() => router.push('/dashboard/user-management')}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                  <Users className="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>
                <div className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-semibold rounded-full">
                  {user.role === 'admin' ? 'Admin' : 'Manager'}
                </div>
              </div>
              <h3 className="text-base font-semibold text-slate-900 mb-0.5">User Management</h3>
              <p className="text-xs text-slate-600 mb-3">Manage team members</p>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-2xl font-bold text-slate-900">
                    {user.role === 'admin' ? 'Admin' : 'Manager'}
                  </div>
                  <div className="text-xs text-indigo-600 font-medium mt-0.5">Access Level</div>
                </div>
                <svg className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          )}

          {/* Real Time Dashboard Card */}
          <div 
            className="group bg-gradient-to-br from-amber-50/50 to-orange-50/30 rounded-xl shadow-sm border border-amber-100 p-5 cursor-pointer hover:shadow-md hover:border-amber-200 transition-all duration-200"
            onClick={() => {
              const baseUrl = 'http://13.200.250.221/realtime-orders';
              const params = new URLSearchParams({
                email: user.email,
                password: 'admin123'
              });
              const urlWithParams = `${baseUrl}?${params.toString()}`;
              window.open(urlWithParams, '_blank');
            }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-11 h-11 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                <Activity className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></div>
                <span className="text-[10px] font-semibold text-amber-600">LIVE</span>
              </div>
            </div>
            <h3 className="text-base font-semibold text-slate-900 mb-0.5">Real Time Dashboard</h3>
            <p className="text-xs text-slate-600 mb-3">Live order tracking</p>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-2xl font-bold text-slate-900">Live</div>
                <div className="text-xs text-amber-600 font-medium mt-0.5">Real-time data</div>
              </div>
              <svg className="w-4 h-4 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
