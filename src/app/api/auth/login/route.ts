import { NextResponse } from 'next/server';
import { UserModel, User } from '@/models/User';
import jwt from 'jsonwebtoken';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user
    const user = await UserModel.findByEmail(email) as User | null;
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Validate password
    const isValid = await UserModel.validatePassword(user, password);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Update last login
    if (user._id) {
    await UserModel.updateLastLogin(user._id);
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user._id?.toString() || '',
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET || 'your-jwt-secret',
      { expiresIn: '7d' }
    );

    // Transform user data to match AuthUser interface
    const userData = {
      id: user._id?.toString() || '',
      name: user.name,
      email: user.email,
      role: user.role,
      isEmailVerified: true, // Default to true for now
      lastLoginAt: user.lastLoginAt,
    };

    return NextResponse.json({
      success: true,
      data: {
        user: userData,
        token,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
