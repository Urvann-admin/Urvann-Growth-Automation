'use client';

import { useAuth } from '@/features/auth/hooks/useAuth';
import { storage } from '@/shared/utils';
import { STORAGE_KEYS } from '@/shared/constants';

export default function AuthDebug() {
  const { user, isAuthenticated, isLoading } = useAuth();
  
  const storedUser = storage.get(STORAGE_KEYS.user);
  const storedToken = storage.get(STORAGE_KEYS.token);
  
  return (
    <div className="fixed top-4 right-4 bg-black text-white p-4 rounded-lg text-xs max-w-sm z-50">
      <h3 className="font-bold mb-2">Auth Debug</h3>
      <div className="space-y-1">
        <div>Loading: {isLoading ? 'true' : 'false'}</div>
        <div>Authenticated: {isAuthenticated ? 'true' : 'false'}</div>
        <div>User: {user ? 'exists' : 'null'}</div>
        <div>User Role: {user?.role || 'none'}</div>
        <div>Stored User: {storedUser ? 'exists' : 'null'}</div>
        <div>Stored Token: {storedToken ? 'exists' : 'null'}</div>
        <div>Storage Keys: {JSON.stringify(STORAGE_KEYS)}</div>
      </div>
    </div>
  );
}










