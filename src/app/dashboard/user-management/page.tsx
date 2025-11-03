'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth';
import UserForm from '@/components/forms/UserForm';
import { userService } from '@/shared/services/api';
import { Users, Plus, LogOut, Edit, Trash2, TreeDeciduous } from 'lucide-react';

interface User {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'team_member';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export default function UserManagementPage() {
  const router = useRouter();
  const { user: currentUser, logout } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Check if user has permission
  useEffect(() => {
    if (!currentUser) {
      router.push('/auth/login');
      return;
    }
    
    if (currentUser.role !== 'admin' && currentUser.role !== 'manager') {
      router.push('/dashboard');
      return;
    }
    
    loadUsers();
  }, [currentUser, router]);

  const loadUsers = async () => {
    try {
      const token = localStorage.getItem('urvann-token');
      
      if (token) {
        const { apiService } = await import('@/shared/services/api');
        apiService.setAuthToken(token);
      } else {
        logout();
        router.push('/auth/login');
        return;
      }

      const result = await userService.getUsers();
      
      if (result.success) {
        setUsers(result.data);
      } else {
        console.error('Failed to load users:', result.message);
      }
    } catch (error: any) {
      console.error('Error loading users:', error);
      if (error.status === 403) {
        logout();
        router.push('/auth/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  const handleCreateUser = async (userData: any) => {
    try {
      const result = await userService.createUser(userData);
      if (result.success) {
        loadUsers();
        setShowCreateForm(false);
      } else {
        alert(result.message || 'Failed to create user');
      }
    } catch (error: any) {
      console.error('Error creating user:', error);
      alert(error.message || 'Failed to create user');
    }
  };

  const handleUpdateUser = async (id: string, userData: any) => {
    try {
      const result = await userService.updateUser(id, userData);
      if (result.success) {
        loadUsers();
        setEditingUser(null);
      } else {
        alert(result.message || 'Failed to update user');
      }
    } catch (error: any) {
      console.error('Error updating user:', error);
      alert(error.message || 'Failed to update user');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
      const result = await userService.deleteUser(id);
      if (result.success) {
        loadUsers();
      } else {
        alert(result.message || 'Failed to delete user');
      }
    } catch (error: any) {
      console.error('Error deleting user:', error);
      alert(error.message || 'Failed to delete user');
    }
  };

  const toggleUserStatus = async (id: string, isActive: boolean) => {
    try {
      const result = await userService.updateUser(id, { isActive });
      if (result.success) {
        loadUsers();
      } else {
        alert(result.message || 'Failed to update user status');
      }
    } catch (error: any) {
      console.error('Error updating user status:', error);
      alert(error.message || 'Failed to update user status');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-3 border-emerald-500 border-t-transparent"></div>
          <p className="text-slate-600 text-sm">Loading users...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-slate-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-emerald-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center shadow-md">
                <Users className="w-6 h-6 text-white" strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-slate-900">
                  User Management
                </h1>
                <p className="text-slate-500 text-xs">Manage team members and their roles</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-lg transition-all font-medium text-xs shadow-md hover:shadow-lg"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Add User
              </button>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all font-medium text-xs"
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
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide border-r border-slate-200">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide border-r border-slate-200">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide border-r border-slate-200">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide border-r border-slate-200">
                    Last Login
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {users && users.length > 0 ? users.map((user, index) => (
                  <tr key={user._id} className={`hover:bg-slate-50/50 transition-colors duration-150 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center mr-3 shadow-sm">
                          <span className="text-xs font-semibold text-white">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-900">{user.name}</div>
                          <div className="text-xs text-slate-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${
                        user.role === 'admin' ? 'bg-rose-100 text-rose-700 border border-rose-200' :
                        user.role === 'manager' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                        'bg-emerald-100 text-emerald-700 border border-emerald-200'
                      }`}>
                        {user.role.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => toggleUserStatus(user._id, !user.isActive)}
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold transition-colors ${
                          user.isActive 
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-200' 
                            : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {user.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600">
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center text-xs font-medium">
                      <div className="flex justify-center space-x-3">
                        <button
                          onClick={() => setEditingUser(user)}
                          className="text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                        >
                          <Edit className="w-4 h-4 inline" />
                        </button>
                        {currentUser.role === 'admin' && user._id !== currentUser.id && (
                          <button
                            onClick={() => handleDeleteUser(user._id)}
                            className="text-rose-600 hover:text-rose-700 font-medium transition-colors"
                          >
                            <Trash2 className="w-4 h-4 inline" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <Users className="w-12 h-12 text-slate-300 mb-3" />
                        <p className="text-slate-500 text-sm font-medium">No users found</p>
                        <p className="text-slate-400 text-xs mt-1">Add your first user to get started</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create User Form */}
      {showCreateForm && (
        <UserForm
          onSubmit={handleCreateUser}
          onCancel={() => setShowCreateForm(false)}
          isEditing={false}
        />
      )}

      {/* Edit User Form */}
      {editingUser && (
        <UserForm
          user={editingUser}
          onSubmit={(userData) => handleUpdateUser(editingUser._id, userData)}
          onCancel={() => setEditingUser(null)}
          isEditing={true}
        />
      )}
    </div>
  );
}
