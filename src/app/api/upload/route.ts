import { NextRequest, NextResponse } from 'next/server';
import { uploadMultipleImagesToS3 } from '@/lib/s3Upload';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files: File[] = [];
    
    // Extract files from form data
    for (const [key, value] of formData.entries()) {
      if (key === 'images' && value instanceof File) {
        files.push(value);
      }
    }
    
    if (files.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No images provided' },
        { status: 400 }
      );
    }

    // Validate file types
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const invalidFiles = files.filter(file => !allowedTypes.includes(file.type));
    
    if (invalidFiles.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Invalid file types: ${invalidFiles.map(f => f.name).join(', ')}. Only JPEG, PNG, and WebP are allowed.` 
        },
        { status: 400 }
      );
    }

    // Validate file sizes (max 5MB per file)
    const maxSize = 5 * 1024 * 1024; // 5MB
    const oversizedFiles = files.filter(file => file.size > maxSize);
    
    if (oversizedFiles.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Files too large: ${oversizedFiles.map(f => f.name).join(', ')}. Maximum size is 5MB per file.` 
        },
        { status: 400 }
      );
    }

    // Upload to S3
    const uploadResult = await uploadMultipleImagesToS3(files, 'parent-master');
    
    if (!uploadResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Failed to upload images',
          errors: uploadResult.errors
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      urls: uploadResult.urls,
      message: `Successfully uploaded ${uploadResult.urls.length} images`,
      ...(uploadResult.errors.length > 0 && { 
        warnings: uploadResult.errors,
        partialSuccess: true 
      })
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to upload images' },
      { status: 500 }
    );
  }
}