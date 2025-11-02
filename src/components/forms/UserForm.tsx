'use client';

import { useState } from 'react';

interface User {
  _id?: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'team_member';
  isActive: boolean;
  password?: string;
}

interface UserFormProps {
  user?: User | null;
  onSubmit: (userData: any) => void;
  onCancel: () => void;
  isEditing?: boolean;
}

export default function UserForm({ user, onSubmit, onCancel, isEditing = false }: UserFormProps) {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    role: user?.role || 'team_member',
    isActive: user?.isActive ?? true,
    password: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!isEditing && !formData.password.trim()) {
      newErrors.password = 'Password is required';
    }

    if (isEditing && formData.password && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const submitData = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      role: formData.role,
      isActive: formData.isActive
    };

    if (formData.password.trim()) {
      submitData.password = formData.password;
    }

    onSubmit(submitData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  return (
    <div className="fixed inset-0 bg-green-800 bg-opacity-90 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 border border-gray-100">
        <div className="px-6 py-6 border-b border-gray-200">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
              <span className="text-2xl font-bold text-green-600">Urvann</span>
              <span className="text-2xl font-bold text-yellow-500">Growth Management</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900">
              {isEditing ? 'Edit User' : 'Create New User'}
            </h3>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              FULL NAME *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 ${
                errors.name ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter full name"
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              EMAIL *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 ${
                errors.email ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter email address"
            />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ROLE *
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
            >
              <option value="team_member">Team Member</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              PASSWORD {isEditing ? '(leave blank to keep current)' : '*'}
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 ${
                errors.password ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder={isEditing ? 'Enter new password' : 'Enter password'}
            />
            {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              name="isActive"
              checked={formData.isActive}
              onChange={handleChange}
              className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-700">
              ACTIVE USER
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-bold text-white bg-yellow-500 hover:bg-yellow-600 rounded-md transition-colors duration-200"
            >
              {isEditing ? 'Update User' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
