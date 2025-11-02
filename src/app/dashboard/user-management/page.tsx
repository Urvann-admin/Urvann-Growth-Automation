'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth';
import UserForm from '@/components/forms/UserForm';
import { userService } from '@/shared/services/api';

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
        // Set auth token for API service
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  // If no current user, don't render anything (will redirect)
  if (!currentUser) {
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">User Management</h1>
                <p className="text-blue-100 text-sm mt-1">Manage team members and their roles</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors duration-200"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add User
              </button>
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
      <div className="p-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-r border-gray-200">
                    User
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-r border-gray-200">
                    Role
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-r border-gray-200">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-r border-gray-200">
                    Last Login
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users && users.length > 0 ? users.map((user, index) => (
                  <tr key={user._id} className={`hover:bg-gray-50 transition-colors duration-150 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-sm font-medium text-blue-600">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.role === 'admin' ? 'bg-red-100 text-red-800' :
                        user.role === 'manager' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {user.role.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleUserStatus(user._id, !user.isActive)}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.isActive 
                            ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                        }`}
                      >
                        {user.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                      <div className="flex justify-center space-x-2">
                        <button
                          onClick={() => setEditingUser(user)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </button>
                        {currentUser.role === 'admin' && user._id !== currentUser.id && (
                          <button
                            onClick={() => handleDeleteUser(user._id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      No users found
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
