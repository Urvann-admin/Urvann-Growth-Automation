import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { UserModel } from '@/models/User';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Token is required' },
        { status: 400 }
      );
    }

    // Verify the current token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret') as any;
    
    // Get user from database
    const user = await UserModel.findById(decoded.userId);
    if (!user || !user.isActive) {
      return NextResponse.json(
        { success: false, message: 'User not found or inactive' },
        { status: 401 }
      );
    }

    // Generate new token
    const newToken = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET || 'your-jwt-secret',
      { expiresIn: '7d' }
    );

    // Remove password from user object
    const { password, ...userWithoutPassword } = user;

    return NextResponse.json({
      success: true,
      data: {
        user: userWithoutPassword,
        token: newToken,
      },
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    return NextResponse.json(
      { success: false, message: 'Invalid token' },
      { status: 401 }
    );
  }
}
