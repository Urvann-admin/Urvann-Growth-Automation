import { NextResponse } from 'next/server';
import { UserModel } from '@/models/User';
import jwt from 'jsonwebtoken';

// Helper function to verify JWT and get user role
async function verifyUserRole(request: Request) {
  try {
    // TEMPORARY: Skip JWT verification for development
    console.log('Users API [id] - Skipping JWT verification for development');
    
    // For now, return a mock admin user to bypass authentication
    const mockUser = {
      _id: 'mock-admin-id',
      email: 'admin@urvann.com',
      name: 'Admin User',
      role: 'admin',
      isActive: true
    };
    
    console.log('Users API [id] - Using mock admin user:', mockUser);
    return mockUser;
  } catch (error) {
    console.error('Users API [id] - JWT verification error:', error);
    return null;
  }
}

// GET - Fetch specific user (admin/manager only)
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifyUserRole(request);
    if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized access' },
        { status: 403 }
      );
    }

    const resolvedParams = await params;
    const targetUser = await UserModel.findById(resolvedParams.id);
    if (!targetUser) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Remove password from response
    const { password, ...sanitizedUser } = targetUser;
    
    return NextResponse.json({ success: true, data: sanitizedUser });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

// PUT - Update user (admin/manager only)
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifyUserRole(request);
    if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized access' },
        { status: 403 }
      );
    }

    const resolvedParams = await params;
    const body = await request.json();
    const { name, email, role, isActive, password } = body;

    // Check if user exists
    const existingUser = await UserModel.findById(resolvedParams.id);
    if (!existingUser) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Validate role if provided
    if (role && !['admin', 'manager', 'team_member'].includes(role)) {
      return NextResponse.json(
        { success: false, message: 'Invalid role' },
        { status: 400 }
      );
    }

    // Check if email is being changed and if it already exists
    if (email && email !== existingUser.email) {
      const emailExists = await UserModel.findByEmail(email);
      if (emailExists) {
        return NextResponse.json(
          { success: false, message: 'User with this email already exists' },
          { status: 400 }
        );
      }
    }

    // Prepare update data
    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (role) updateData.role = role;
    if (typeof isActive === 'boolean') updateData.isActive = isActive;
    if (password) updateData.password = password;

    // Update user
    await UserModel.update(resolvedParams.id, updateData);
    
    return NextResponse.json({ 
      success: true, 
      message: 'User updated successfully' 
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update user' },
      { status: 500 }
    );
  }
}

// DELETE - Delete user (admin only)
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifyUserRole(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized access - Admin role required' },
        { status: 403 }
      );
    }

    const resolvedParams = await params;
    // Check if user exists
    const targetUser = await UserModel.findById(resolvedParams.id);
    if (!targetUser) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Prevent admin from deleting themselves
    if (targetUser._id?.toString() === user._id?.toString()) {
      return NextResponse.json(
        { success: false, message: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    // Delete user
    await UserModel.delete(resolvedParams.id);
    
    return NextResponse.json({ 
      success: true, 
      message: 'User deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
