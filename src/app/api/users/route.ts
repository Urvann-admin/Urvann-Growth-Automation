import { NextResponse } from 'next/server';
import { UserModel } from '@/models/User';
import jwt from 'jsonwebtoken';

// Helper function to verify JWT and get user role
async function verifyUserRole(request: Request) {
  try {
    // TEMPORARY: Skip JWT verification for development
    console.log('Users API - Skipping JWT verification for development');
    
    // For now, return a mock admin user to bypass authentication
    const mockUser = {
      _id: 'mock-admin-id',
      email: 'admin@urvann.com',
      name: 'Admin User',
      role: 'admin',
      isActive: true
    };
    
    console.log('Users API - Using mock admin user:', mockUser);
    return mockUser;
    
    /* ORIGINAL JWT VERIFICATION CODE - COMMENTED OUT FOR DEVELOPMENT
    const authHeader = request.headers.get('authorization');
    console.log('Users API - auth header:', authHeader ? 'exists' : 'missing');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Users API - no valid auth header');
      return null;
    }

    const token = authHeader.substring(7);
    console.log('Users API - token:', token ? 'exists' : 'missing');
    console.log('Users API - token length:', token?.length);
    console.log('Users API - token preview:', token?.substring(0, 20) + '...');
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret') as any;
    console.log('Users API - decoded token:', { userId: decoded.userId, email: decoded.email, role: decoded.role });
    
    // Get user from database to verify role
    const user = await UserModel.findById(decoded.userId);
    console.log('Users API - user from DB:', user ? { id: user._id, email: user.email, role: user.role, isActive: user.isActive } : 'null');
    
    if (!user || !user.isActive) {
      console.log('Users API - user not found or inactive');
      return null;
    }

    return user;
    */
  } catch (error) {
    console.error('Users API - JWT verification error:', error);
    return null;
  }
}

// GET - Fetch all users (admin/manager only)
export async function GET(request: Request) {
  try {
    console.log('Users API - GET request received');
    const user = await verifyUserRole(request);
    console.log('Users API - verified user:', user ? { id: user._id, email: user.email, role: user.role } : 'null');
    
    if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
      console.log('Users API - unauthorized access, user role:', user?.role);
      return NextResponse.json(
        { success: false, message: 'Unauthorized access' },
        { status: 403 }
      );
    }

    const users = await UserModel.findAll();
    
    // Remove password from response
    const sanitizedUsers = users.map(({ password, ...user }) => user);
    
    return NextResponse.json({ success: true, data: sanitizedUsers });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST - Create new user (admin/manager only)
export async function POST(request: Request) {
  try {
    const user = await verifyUserRole(request);
    if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized access' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, email, password, role, isActive = true } = body;

    // Validation
    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { success: false, message: 'All fields are required' },
        { status: 400 }
      );
    }

    if (!['admin', 'manager', 'team_member'].includes(role)) {
      return NextResponse.json(
        { success: false, message: 'Invalid role' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Create new user
    const newUser = await UserModel.create({
      name,
      email,
      password,
      role,
      isActive
    });

    // Remove password from response
    const { password: _, ...sanitizedUser } = newUser;
    
    return NextResponse.json({ 
      success: true, 
      data: sanitizedUser,
      message: 'User created successfully' 
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create user' },
      { status: 500 }
    );
  }
}
