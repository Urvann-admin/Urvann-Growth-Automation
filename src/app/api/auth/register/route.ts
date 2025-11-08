import { NextResponse } from 'next/server';
import { UserModel } from '@/models/User';
import jwt from 'jsonwebtoken';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password } = body;

    // Validate input
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Create new user
    const user = await UserModel.create({
      name,
      email,
      password,
      role: 'team_member', // Default role
      isActive: true,
    });

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
      lastLoginAt: (user as any).lastLoginAt,
    };

    return NextResponse.json({
      success: true,
      data: {
        user: userData,
        token,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
