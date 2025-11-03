'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Leaf, Mail, Lock, Eye, EyeOff, Sprout, TreeDeciduous } from 'lucide-react';
import './login.css';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(formData);
      router.push('/dashboard');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Brand Section */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-900 via-emerald-800 to-green-900 relative overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-64 h-64 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-emerald-300 rounded-full blur-3xl"></div>
        </div>
        
        {/* Floating Leaf Decorations */}
        <Leaf className="absolute top-10 right-20 w-12 h-12 text-emerald-300/30 leaf-float" />
        <Sprout className="absolute bottom-32 left-16 w-16 h-16 text-green-300/20 grow-animation" />
        <TreeDeciduous className="absolute top-1/3 left-1/4 w-20 h-20 text-emerald-400/20 leaf-float-delayed" />
        <Leaf className="absolute bottom-1/4 right-1/3 w-10 h-10 text-green-300/25 leaf-float" style={{ animationDelay: '1s' }} />
        <Sprout className="absolute top-1/2 right-10 w-8 h-8 text-emerald-300/30 grow-animation" style={{ animationDelay: '1.5s' }} />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full px-12 text-white">
          {/* Logo */}
          <div className="mb-8">
            <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-3xl flex items-center justify-center shadow-2xl border border-white/20">
              <div className="relative">
                <TreeDeciduous className="w-16 h-16 text-white" strokeWidth={1.5} />
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
                  <Sprout className="w-4 h-4 text-emerald-300" strokeWidth={2} />
                  <Sprout className="w-4 h-4 text-green-300" strokeWidth={2} />
                </div>
              </div>
            </div>
          </div>

          {/* Brand Name */}
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-white to-emerald-100 bg-clip-text text-transparent">
            Urvann Growth
          </h1>
          <p className="text-emerald-100 text-lg mb-8 text-center max-w-md">
            Cultivating Success, One Plant at a Time
          </p>

          {/* Feature Pills */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 max-w-md border border-white/20 shadow-xl">
            <div className="flex flex-wrap gap-2 justify-center">
              <span className="px-4 py-2 bg-emerald-500/20 rounded-full text-emerald-100 text-sm border border-emerald-400/30">
                🌱 Real-time Analytics
              </span>
              <span className="px-4 py-2 bg-green-500/20 rounded-full text-green-100 text-sm border border-green-400/30">
                📊 Growth Tracking
              </span>
              <span className="px-4 py-2 bg-emerald-500/20 rounded-full text-emerald-100 text-sm border border-emerald-400/30">
                🌿 Inventory Management
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex flex-col items-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg mb-3">
                <TreeDeciduous className="w-10 h-10 text-white" strokeWidth={1.5} />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-700 to-green-600 bg-clip-text text-transparent">
                Urvann Growth
              </h1>
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-emerald-100/50 p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-emerald-700 to-green-600 bg-clip-text text-transparent mb-2">
                Welcome Back
              </h2>
              <p className="text-slate-600 text-sm">
                Sign in to access your growth dashboard
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Input */}
            <div>
                <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2">
                  Email
              </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-emerald-500" />
                  </div>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all bg-white/50"
                    placeholder="Enter your email"
              />
                </div>
            </div>

              {/* Password Input */}
            <div>
                <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-2">
                  Password
              </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-emerald-500" />
                  </div>
              <input
                id="password"
                name="password"
                    type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleChange}
                    className="block w-full pl-10 pr-12 py-3 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all bg-white/50"
                placeholder="Enter your password"
              />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-slate-400 hover:text-slate-600 transition-colors" />
                    ) : (
                      <Eye className="h-5 w-5 text-slate-400 hover:text-slate-600 transition-colors" />
                    )}
                  </button>
                </div>
            </div>

              {/* Remember Me */}
            <div className="flex items-center">
                <label className="flex items-center cursor-pointer group">
              <input
                type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 focus:ring-2 cursor-pointer"
              />
                  <span className="ml-2 text-sm text-slate-700 group-hover:text-emerald-700 transition-colors">
                    Remember me
                  </span>
              </label>
            </div>

              {/* Error Message */}
            {error && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start space-x-2">
                  <svg className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm text-rose-700">{error}</p>
              </div>
            )}

              {/* Login Button */}
              <button
              type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-semibold py-3.5 px-4 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Login</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>
          </form>

            {/* Footer */}
          <div className="mt-6 text-center">
              <p className="text-sm text-slate-600">
                Need access?{' '}
                <button className="font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
                  Contact Administrator
                </button>
            </p>
            </div>
          </div>

          {/* Bottom Note */}
          <p className="mt-6 text-center text-xs text-slate-500">
            By signing in, you agree to our{' '}
            <button className="text-emerald-600 hover:text-emerald-700 font-medium">Terms of Service</button>
            {' '}and{' '}
            <button className="text-emerald-600 hover:text-emerald-700 font-medium">Privacy Policy</button>
          </p>
        </div>
      </div>
    </div>
  );
}
