'use client';

import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/Button";
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useEffect, useState } from 'react';
import { TrendingUp, Users, Activity, LogOut, TreeDeciduous, Building2, Upload, ShoppingCart, Gift, Sparkles } from 'lucide-react';
import { storage } from '@/shared/utils';
import { STORAGE_KEYS } from '@/shared/constants';
import type { AuthUser } from '@/shared/types/api';
import { ChristmasTheme } from '@/components/theme/ChristmasTheme';
import { THEME_CONFIG, CHRISTMAS_COLORS } from '@/config/theme';

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout, isLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    console.log('Dashboard - isLoading:', isLoading);
    console.log('Dashboard - user:', user);
    console.log('Dashboard - user role:', user?.role);

    const isReturningFromRealtime =
      typeof window !== 'undefined' &&
      sessionStorage.getItem('returning_to_dashboard') === 'true';

    // Clear redirect flags when returning to dashboard
    if (isReturningFromRealtime && typeof window !== 'undefined') {
      sessionStorage.removeItem('returning_to_dashboard');
      sessionStorage.removeItem('realtime_redirect_in_progress');
      sessionStorage.removeItem('returning_from_realtime_dashboard');
    }

    // Wait for auth to finish loading before checking user
    if (isLoading) {
      return;
    }

    if (!user) {
      if (typeof window !== 'undefined') {
        const storedUser = localStorage.getItem('urvann-user');
        const storedToken = localStorage.getItem('urvann-token');

        if (isReturningFromRealtime && storedUser && storedToken) {
          console.log('Returning user detected, waiting for auth context to sync...');
          return;
        }
      }

      console.log('No user, redirecting to login');
      sessionStorage.removeItem('returning_to_dashboard');
      sessionStorage.removeItem('realtime_redirect_in_progress');
      router.push('/auth/login');
    } else {
      console.log('User found, setting loading to false');
      setLoading(false);
    }
  }, [user, isLoading, router]);
  
  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  const isChristmasTheme = THEME_CONFIG.ENABLE_CHRISTMAS_THEME;

  if (loading) {
    return (
      <ChristmasTheme variant="dashboard">
        <div 
          className={`min-h-screen flex items-center justify-center ${isChristmasTheme ? '' : 'bg-gradient-to-br from-slate-50 via-white to-emerald-50/30'}`}
          style={isChristmasTheme ? {
            background: `linear-gradient(135deg, ${CHRISTMAS_COLORS.background} 0%, ${CHRISTMAS_COLORS.white} 50%, ${CHRISTMAS_COLORS.light} 100%)`,
          } : {}}
        >
          <div className="flex flex-col items-center space-y-4">
            <div 
              className={`animate-spin rounded-full h-12 w-12 border-3 border-t-transparent ${isChristmasTheme ? '' : 'border-emerald-500'}`}
              style={isChristmasTheme ? {
                borderColor: `${CHRISTMAS_COLORS.primary} transparent transparent transparent`,
              } : {}}
            ></div>
            <p className={`text-sm ${isChristmasTheme ? 'text-slate-700' : 'text-slate-600'}`}>
              {isChristmasTheme ? '🎄 Loading dashboard... 🎁' : 'Loading dashboard...'}
            </p>
          </div>
        </div>
      </ChristmasTheme>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <ChristmasTheme variant="dashboard">
      <div 
        className={`min-h-screen ${isChristmasTheme ? '' : 'bg-gradient-to-br from-slate-50 via-emerald-50/20 to-slate-50'}`}
        style={isChristmasTheme ? {
          background: `linear-gradient(135deg, ${CHRISTMAS_COLORS.background} 0%, ${CHRISTMAS_COLORS.white} 50%, ${CHRISTMAS_COLORS.light} 100%)`,
        } : {}}
      >
        {/* Header */}
        <div 
          className={`bg-white shadow-sm sticky top-0 z-10 ${isChristmasTheme ? '' : 'border-b border-emerald-100/50'}`}
          style={isChristmasTheme ? {
            borderBottom: `2px solid ${CHRISTMAS_COLORS.light}`,
            boxShadow: `0 4px 6px -1px ${CHRISTMAS_COLORS.primary}/10`,
          } : {}}
        >
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div 
                className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-md ${isChristmasTheme ? '' : 'bg-gradient-to-br from-emerald-500 to-green-600'}`}
                style={isChristmasTheme ? {
                  background: `linear-gradient(135deg, ${CHRISTMAS_COLORS.primary} 0%, ${CHRISTMAS_COLORS.secondary} 100%)`,
                } : {}}
              >
                {isChristmasTheme ? (
                  <Gift className="w-6 h-6 text-white" strokeWidth={1.5} />
                ) : (
                  <TreeDeciduous className="w-6 h-6 text-white" strokeWidth={1.5} />
                )}
              </div>
              <div>
                <h1 className="text-lg font-semibold text-slate-900">
                  {isChristmasTheme ? '🎄 Dashboard 🎁' : 'Dashboard'}
                </h1>
                <p className={`text-xs ${isChristmasTheme ? 'text-slate-600' : 'text-slate-500'}`}>
                  {isChristmasTheme ? 'Urvann Growth Management - Happy Holidays!' : 'Urvann Growth Management'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div 
                className={`hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-lg ${isChristmasTheme ? '' : 'bg-emerald-50/50 border border-emerald-100'}`}
                style={isChristmasTheme ? {
                  background: `${CHRISTMAS_COLORS.light}/50`,
                  border: `1px solid ${CHRISTMAS_COLORS.light}`,
                } : {}}
              >
                <div 
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-white font-semibold text-xs ${isChristmasTheme ? '' : 'bg-gradient-to-br from-emerald-500 to-green-600'}`}
                  style={isChristmasTheme ? {
                    background: `linear-gradient(135deg, ${CHRISTMAS_COLORS.primary} 0%, ${CHRISTMAS_COLORS.secondary} 100%)`,
                  } : {}}
                >
                  {user.email?.charAt(0).toUpperCase()}
                </div>
                <div className="text-xs">
                  <p className="font-medium text-slate-900">{user.email}</p>
                  <p 
                    className={`text-[10px] capitalize ${isChristmasTheme ? '' : 'text-emerald-600'}`}
                    style={isChristmasTheme ? { color: CHRISTMAS_COLORS.primary } : {}}
                  >
                    {user.role}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className={`inline-flex items-center px-3 py-1.5 text-slate-700 rounded-lg transition-all font-medium text-xs border border-transparent ${isChristmasTheme ? 'bg-slate-100 hover:bg-red-50' : 'bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200'}`}
                onMouseEnter={(e) => {
                  if (isChristmasTheme) {
                    e.currentTarget.style.backgroundColor = CHRISTMAS_COLORS.light;
                    e.currentTarget.style.color = CHRISTMAS_COLORS.primary;
                    e.currentTarget.style.borderColor = CHRISTMAS_COLORS.light;
                  }
                }}
                onMouseLeave={(e) => {
                  if (isChristmasTheme) {
                    e.currentTarget.style.backgroundColor = '';
                    e.currentTarget.style.color = '';
                    e.currentTarget.style.borderColor = '';
                  }
                }}
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
        <div className="flex flex-col items-center gap-6">
          {/* First Row - 4 Cards */}
          <div className="flex justify-center gap-6">
            {/* Growth Metrics Card */}
            <div 
              className={`group rounded-xl shadow-sm p-5 cursor-pointer transition-all duration-200 w-[280px] flex-shrink-0 ${isChristmasTheme ? '' : 'bg-gradient-to-br from-emerald-50/50 to-green-50/30 border border-emerald-100 hover:shadow-md hover:border-emerald-200'}`}
              style={isChristmasTheme ? {
                background: `linear-gradient(135deg, ${CHRISTMAS_COLORS.light}/50 0%, ${CHRISTMAS_COLORS.white} 100%)`,
                border: `2px solid ${CHRISTMAS_COLORS.light}`,
                boxShadow: `0 4px 6px -1px ${CHRISTMAS_COLORS.primary}/10`,
              } : {}}
              onClick={() => router.push('/dashboard/growth-analytics')}
              onMouseEnter={(e) => {
                if (isChristmasTheme) {
                  e.currentTarget.style.boxShadow = `0 10px 15px -3px ${CHRISTMAS_COLORS.primary}/30`;
                  e.currentTarget.style.borderColor = CHRISTMAS_COLORS.accent;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                if (isChristmasTheme) {
                  e.currentTarget.style.boxShadow = `0 4px 6px -1px ${CHRISTMAS_COLORS.primary}/10`;
                  e.currentTarget.style.borderColor = CHRISTMAS_COLORS.light;
                  e.currentTarget.style.transform = '';
                }
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div 
                  className={`w-11 h-11 rounded-lg flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform ${isChristmasTheme ? '' : 'bg-gradient-to-br from-emerald-500 to-green-600'}`}
                  style={isChristmasTheme ? {
                    background: `linear-gradient(135deg, ${CHRISTMAS_COLORS.primary} 0%, ${CHRISTMAS_COLORS.secondary} 100%)`,
                  } : {}}
                >
                  <TrendingUp className="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>
                <div 
                  className={`w-1.5 h-1.5 rounded-full animate-pulse ${isChristmasTheme ? '' : 'bg-emerald-500'}`}
                  style={isChristmasTheme ? { backgroundColor: CHRISTMAS_COLORS.primary } : {}}
                ></div>
              </div>
              <h3 className="text-base font-semibold text-slate-900 mb-0.5">
                {isChristmasTheme ? '🎄 Availability Dashboard' : 'Availability Dashboard'}
              </h3>
              <p className="text-xs text-slate-600 mb-3">Track product availability</p>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-2xl font-bold text-slate-900">Analytics</div>
                  <div 
                    className={`text-xs font-medium mt-0.5 ${isChristmasTheme ? '' : 'text-emerald-600'}`}
                    style={isChristmasTheme ? { color: CHRISTMAS_COLORS.primary } : {}}
                  >
                    View availability
                  </div>
                </div>
                <svg 
                  className={`w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-all ${isChristmasTheme ? '' : 'group-hover:text-emerald-600'}`}
                  style={isChristmasTheme ? {} : {}}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  onMouseEnter={(e) => {
                    if (isChristmasTheme) {
                      e.currentTarget.style.color = CHRISTMAS_COLORS.primary;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (isChristmasTheme) {
                      e.currentTarget.style.color = '';
                    }
                  }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>

            {/* Real Time Dashboard Card */}
            <div 
              className={`group rounded-xl shadow-sm p-5 cursor-pointer transition-all duration-200 w-[280px] flex-shrink-0 ${isChristmasTheme ? '' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/30 border border-amber-100 hover:shadow-md hover:border-amber-200'}`}
              style={isChristmasTheme ? {
                background: `linear-gradient(135deg, ${CHRISTMAS_COLORS.light}/50 0%, ${CHRISTMAS_COLORS.white} 100%)`,
                border: `2px solid ${CHRISTMAS_COLORS.light}`,
                boxShadow: `0 4px 6px -1px ${CHRISTMAS_COLORS.primary}/10`,
              } : {}}
              onMouseEnter={(e) => {
                if (isChristmasTheme) {
                  e.currentTarget.style.boxShadow = `0 10px 15px -3px ${CHRISTMAS_COLORS.primary}/30`;
                  e.currentTarget.style.borderColor = CHRISTMAS_COLORS.accent;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                if (isChristmasTheme) {
                  e.currentTarget.style.boxShadow = `0 4px 6px -1px ${CHRISTMAS_COLORS.primary}/10`;
                  e.currentTarget.style.borderColor = CHRISTMAS_COLORS.light;
                  e.currentTarget.style.transform = '';
                }
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Clear any stuck flags first
                sessionStorage.removeItem('realtime_redirect_in_progress');
                sessionStorage.removeItem('returning_from_realtime_dashboard');
                sessionStorage.removeItem('returning_to_dashboard');
                
                console.log('Real Time Dashboard clicked - redirecting immediately');
                
                // Get user email from localStorage
                const storedUser = storage.get<AuthUser>(STORAGE_KEYS.user);
                const userEmail = storedUser?.email || '';
                
                if (!userEmail) {
                  console.error('Real Time Dashboard: No user email found');
                  alert('User email not found. Please refresh and try again.');
                  return;
                }
                
                // Build external URL with params - use full URL for returnUrl
                const externalUrl = 'http://65.0.138.213:5002/dashboard/realtime-orders';
                const returnUrl = encodeURIComponent(`${window.location.origin}/dashboard`);
                const params = new URLSearchParams({
                  returnUrl: returnUrl,
                  email: userEmail,
                });
                const externalUrlWithParams = `${externalUrl}?${params.toString()}`;
                
                console.log('Redirecting to:', externalUrlWithParams);
                console.log('Return URL will be:', returnUrl);
                
                // Immediate redirect to external URL
                window.location.href = externalUrlWithParams;
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div 
                  className={`w-11 h-11 rounded-lg flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform ${isChristmasTheme ? '' : 'bg-gradient-to-br from-amber-500 to-orange-600'}`}
                  style={isChristmasTheme ? {
                    background: `linear-gradient(135deg, ${CHRISTMAS_COLORS.primary} 0%, ${CHRISTMAS_COLORS.secondary} 100%)`,
                  } : {}}
                >
                  <Activity className="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>
                <div className="flex items-center space-x-1">
                  <div 
                    className={`w-1.5 h-1.5 rounded-full animate-pulse ${isChristmasTheme ? '' : 'bg-amber-500'}`}
                    style={isChristmasTheme ? { backgroundColor: CHRISTMAS_COLORS.primary } : {}}
                  ></div>
                  <span 
                    className={`text-[10px] font-semibold ${isChristmasTheme ? '' : 'text-amber-600'}`}
                    style={isChristmasTheme ? { color: CHRISTMAS_COLORS.primary } : {}}
                  >
                    LIVE
                  </span>
                </div>
              </div>
              <h3 className="text-base font-semibold text-slate-900 mb-0.5">
                {isChristmasTheme ? '🎄 Real Time Dashboard' : 'Real Time Dashboard'}
              </h3>
              <p className="text-xs text-slate-600 mb-3">Live order tracking</p>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-2xl font-bold text-slate-900">Live</div>
                  <div 
                    className={`text-xs font-medium mt-0.5 ${isChristmasTheme ? '' : 'text-amber-600'}`}
                    style={isChristmasTheme ? { color: CHRISTMAS_COLORS.primary } : {}}
                  >
                    Real-time data
                  </div>
                </div>
                <svg className="w-4 h-4 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </div>
            </div>

          {/* Saathi App Logs Card */}
          <div 
            className={`group rounded-xl shadow-sm p-5 cursor-pointer transition-all duration-200 w-[280px] flex-shrink-0 ${isChristmasTheme ? '' : 'bg-gradient-to-br from-violet-50/50 to-purple-50/30 border border-violet-100 hover:shadow-md hover:border-violet-200'}`}
            style={isChristmasTheme ? {
              background: `linear-gradient(135deg, ${CHRISTMAS_COLORS.light}/50 0%, ${CHRISTMAS_COLORS.white} 100%)`,
              border: `2px solid ${CHRISTMAS_COLORS.light}`,
              boxShadow: `0 4px 6px -1px ${CHRISTMAS_COLORS.primary}/10`,
            } : {}}
            onClick={() => router.push('/dashboard/saathi-app-logs')}
            onMouseEnter={(e) => {
              if (isChristmasTheme) {
                e.currentTarget.style.boxShadow = `0 10px 15px -3px ${CHRISTMAS_COLORS.primary}/30`;
                e.currentTarget.style.borderColor = CHRISTMAS_COLORS.accent;
                e.currentTarget.style.transform = 'translateY(-2px)';
              }
            }}
            onMouseLeave={(e) => {
              if (isChristmasTheme) {
                e.currentTarget.style.boxShadow = `0 4px 6px -1px ${CHRISTMAS_COLORS.primary}/10`;
                e.currentTarget.style.borderColor = CHRISTMAS_COLORS.light;
                e.currentTarget.style.transform = '';
              }
            }}
          >
            <div className="flex items-start justify-between mb-3">
              <div 
                className={`w-11 h-11 rounded-lg flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform ${isChristmasTheme ? '' : 'bg-gradient-to-br from-violet-500 to-purple-600'}`}
                style={isChristmasTheme ? {
                  background: `linear-gradient(135deg, ${CHRISTMAS_COLORS.primary} 0%, ${CHRISTMAS_COLORS.secondary} 100%)`,
                } : {}}
              >
                <Building2 className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <div 
                className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${isChristmasTheme ? '' : 'bg-violet-100 text-violet-700'}`}
                style={isChristmasTheme ? {
                  background: CHRISTMAS_COLORS.light,
                  color: CHRISTMAS_COLORS.primary,
                } : {}}
              >
                LOGS
              </div>
            </div>
            <h3 className="text-base font-semibold text-slate-900 mb-0.5">
              {isChristmasTheme ? '🎄 Product Logs' : 'Product Logs'}
            </h3>
            <p className="text-xs text-slate-600 mb-3">Seller & product inventory</p>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-2xl font-bold text-slate-900">Sellers</div>
                <div 
                  className={`text-xs font-medium mt-0.5 ${isChristmasTheme ? '' : 'text-violet-600'}`}
                  style={isChristmasTheme ? { color: CHRISTMAS_COLORS.primary } : {}}
                >
                  View all sellers
                </div>
              </div>
              <svg 
                className={`w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-all ${isChristmasTheme ? '' : 'group-hover:text-violet-600'}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                onMouseEnter={(e) => {
                  if (isChristmasTheme) {
                    e.currentTarget.style.color = CHRISTMAS_COLORS.primary;
                  }
                }}
                onMouseLeave={(e) => {
                  if (isChristmasTheme) {
                    e.currentTarget.style.color = '';
                  }
                }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>

            {/* Data Upload Card */}
            {(user.role === 'admin' || user.role === 'manager') && (
              <div 
                className={`group rounded-xl shadow-sm p-5 cursor-pointer transition-all duration-200 w-[280px] flex-shrink-0 ${isChristmasTheme ? '' : 'bg-gradient-to-br from-blue-50/50 to-cyan-50/30 border border-blue-100 hover:shadow-md hover:border-blue-200'}`}
                style={isChristmasTheme ? {
                  background: `linear-gradient(135deg, ${CHRISTMAS_COLORS.light}/50 0%, ${CHRISTMAS_COLORS.white} 100%)`,
                  border: `2px solid ${CHRISTMAS_COLORS.light}`,
                  boxShadow: `0 4px 6px -1px ${CHRISTMAS_COLORS.primary}/10`,
                } : {}}
                onClick={() => router.push('/dashboard/data-upload')}
                onMouseEnter={(e) => {
                  if (isChristmasTheme) {
                    e.currentTarget.style.boxShadow = `0 10px 15px -3px ${CHRISTMAS_COLORS.primary}/30`;
                    e.currentTarget.style.borderColor = CHRISTMAS_COLORS.accent;
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (isChristmasTheme) {
                    e.currentTarget.style.boxShadow = `0 4px 6px -1px ${CHRISTMAS_COLORS.primary}/10`;
                    e.currentTarget.style.borderColor = CHRISTMAS_COLORS.light;
                    e.currentTarget.style.transform = '';
                  }
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div 
                    className={`w-11 h-11 rounded-lg flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform ${isChristmasTheme ? '' : 'bg-gradient-to-br from-blue-500 to-cyan-600'}`}
                    style={isChristmasTheme ? {
                      background: `linear-gradient(135deg, ${CHRISTMAS_COLORS.primary} 0%, ${CHRISTMAS_COLORS.secondary} 100%)`,
                    } : {}}
                  >
                    <Upload className="w-5 h-5 text-white" strokeWidth={2.5} />
                  </div>
                  <div 
                    className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${isChristmasTheme ? '' : 'bg-blue-100 text-blue-700'}`}
                    style={isChristmasTheme ? {
                      background: CHRISTMAS_COLORS.light,
                      color: CHRISTMAS_COLORS.primary,
                    } : {}}
                  >
                    Upload
                  </div>
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-0.5">
                  {isChristmasTheme ? '🎄 Data Upload' : 'Data Upload'}
                </h3>
                <p className="text-xs text-slate-600 mb-3">Upload category data</p>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-2xl font-bold text-slate-900">Upload</div>
                    <div 
                      className={`text-xs font-medium mt-0.5 ${isChristmasTheme ? '' : 'text-blue-600'}`}
                      style={isChristmasTheme ? { color: CHRISTMAS_COLORS.primary } : {}}
                    >
                      CSV/XLSX files
                    </div>
                  </div>
                  <svg 
                    className={`w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-all ${isChristmasTheme ? '' : 'group-hover:text-blue-600'}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                    onMouseEnter={(e) => {
                      if (isChristmasTheme) {
                        e.currentTarget.style.color = CHRISTMAS_COLORS.primary;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (isChristmasTheme) {
                        e.currentTarget.style.color = '';
                      }
                    }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            )}
          </div>

          {/* Second Row */}
          <div className="flex justify-center gap-6">
            {/* User Management Card */}
          {(user.role === 'admin' || user.role === 'manager') && (
              <div 
                className={`group rounded-xl shadow-sm p-5 cursor-pointer transition-all duration-200 w-[280px] flex-shrink-0 ${isChristmasTheme ? '' : 'bg-gradient-to-br from-indigo-50/50 to-purple-50/30 border border-indigo-100 hover:shadow-md hover:border-indigo-200'}`}
                style={isChristmasTheme ? {
                  background: `linear-gradient(135deg, ${CHRISTMAS_COLORS.light}/50 0%, ${CHRISTMAS_COLORS.white} 100%)`,
                  border: `2px solid ${CHRISTMAS_COLORS.light}`,
                  boxShadow: `0 4px 6px -1px ${CHRISTMAS_COLORS.primary}/10`,
                } : {}}
                onClick={() => router.push('/dashboard/user-management')}
                onMouseEnter={(e) => {
                  if (isChristmasTheme) {
                    e.currentTarget.style.boxShadow = `0 10px 15px -3px ${CHRISTMAS_COLORS.primary}/30`;
                    e.currentTarget.style.borderColor = CHRISTMAS_COLORS.accent;
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (isChristmasTheme) {
                    e.currentTarget.style.boxShadow = `0 4px 6px -1px ${CHRISTMAS_COLORS.primary}/10`;
                    e.currentTarget.style.borderColor = CHRISTMAS_COLORS.light;
                    e.currentTarget.style.transform = '';
                  }
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div 
                    className={`w-11 h-11 rounded-lg flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform ${isChristmasTheme ? '' : 'bg-gradient-to-br from-indigo-500 to-purple-600'}`}
                    style={isChristmasTheme ? {
                      background: `linear-gradient(135deg, ${CHRISTMAS_COLORS.primary} 0%, ${CHRISTMAS_COLORS.secondary} 100%)`,
                    } : {}}
                  >
                    <Users className="w-5 h-5 text-white" strokeWidth={2.5} />
                  </div>
                  <div 
                    className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${isChristmasTheme ? '' : 'bg-indigo-100 text-indigo-700'}`}
                    style={isChristmasTheme ? {
                      background: CHRISTMAS_COLORS.light,
                      color: CHRISTMAS_COLORS.primary,
                    } : {}}
                  >
                    {user.role === 'admin' ? 'Admin' : 'Manager'}
                  </div>
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-0.5">
                  {isChristmasTheme ? '🎄 User Management' : 'User Management'}
                </h3>
                <p className="text-xs text-slate-600 mb-3">Manage team members</p>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-2xl font-bold text-slate-900">
                      {user.role === 'admin' ? 'Admin' : 'Manager'}
                    </div>
                    <div 
                      className={`text-xs font-medium mt-0.5 ${isChristmasTheme ? '' : 'text-indigo-600'}`}
                      style={isChristmasTheme ? { color: CHRISTMAS_COLORS.primary } : {}}
                    >
                      Access Level
                    </div>
                  </div>
                  <svg 
                    className={`w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-all ${isChristmasTheme ? '' : 'group-hover:text-indigo-600'}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                    onMouseEnter={(e) => {
                      if (isChristmasTheme) {
                        e.currentTarget.style.color = CHRISTMAS_COLORS.primary;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (isChristmasTheme) {
                        e.currentTarget.style.color = '';
                      }
                    }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            )}

            {/* Frequently Bought Together Card - Admin Only */}
            {user.role === 'admin' && (
              <div 
                className={`group rounded-xl shadow-sm p-5 cursor-pointer transition-all duration-200 w-[280px] flex-shrink-0 ${isChristmasTheme ? '' : 'bg-gradient-to-br from-teal-50/50 to-emerald-50/30 border border-teal-100 hover:shadow-md hover:border-teal-200'}`}
              style={isChristmasTheme ? {
                background: `linear-gradient(135deg, ${CHRISTMAS_COLORS.light}/50 0%, ${CHRISTMAS_COLORS.white} 100%)`,
                border: `2px solid ${CHRISTMAS_COLORS.light}`,
                boxShadow: `0 4px 6px -1px ${CHRISTMAS_COLORS.primary}/10`,
              } : {}}
              onClick={() => router.push('/dashboard/frequently-bought/analysis')}
              onMouseEnter={(e) => {
                if (isChristmasTheme) {
                  e.currentTarget.style.boxShadow = `0 10px 15px -3px ${CHRISTMAS_COLORS.primary}/30`;
                  e.currentTarget.style.borderColor = CHRISTMAS_COLORS.accent;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                if (isChristmasTheme) {
                  e.currentTarget.style.boxShadow = `0 4px 6px -1px ${CHRISTMAS_COLORS.primary}/10`;
                  e.currentTarget.style.borderColor = CHRISTMAS_COLORS.light;
                  e.currentTarget.style.transform = '';
                }
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div 
                  className={`w-11 h-11 rounded-lg flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform ${isChristmasTheme ? '' : 'bg-gradient-to-br from-teal-500 to-emerald-600'}`}
                  style={isChristmasTheme ? {
                    background: `linear-gradient(135deg, ${CHRISTMAS_COLORS.primary} 0%, ${CHRISTMAS_COLORS.secondary} 100%)`,
                  } : {}}
                >
                  <ShoppingCart className="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>
                <div 
                  className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${isChristmasTheme ? '' : 'bg-teal-100 text-teal-700'}`}
                  style={isChristmasTheme ? {
                    background: CHRISTMAS_COLORS.light,
                    color: CHRISTMAS_COLORS.primary,
                  } : {}}
                >
                  INSIGHTS
                </div>
              </div>
              <h3 className="text-base font-semibold text-slate-900 mb-0.5">
                {isChristmasTheme ? '🎄 Frequently Bought' : 'Frequently Bought'}
              </h3>
              <p className="text-xs text-slate-600 mb-3">Co-purchase analysis</p>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-2xl font-bold text-slate-900">Patterns</div>
                  <div 
                    className={`text-xs font-medium mt-0.5 ${isChristmasTheme ? '' : 'text-teal-600'}`}
                    style={isChristmasTheme ? { color: CHRISTMAS_COLORS.primary } : {}}
                  >
                    View product pairs
                  </div>
                </div>
                <svg 
                  className={`w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-all ${isChristmasTheme ? '' : 'group-hover:text-teal-600'}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  onMouseEnter={(e) => {
                    if (isChristmasTheme) {
                      e.currentTarget.style.color = CHRISTMAS_COLORS.primary;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (isChristmasTheme) {
                      e.currentTarget.style.color = '';
                    }
                  }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </ChristmasTheme>
  );
}
