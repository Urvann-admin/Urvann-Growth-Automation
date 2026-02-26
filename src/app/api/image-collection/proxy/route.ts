import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

const region = process.env.AWS_REGION || 'ap-south-1';
const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || 'urvann-growth-parent-images';
const s3 = new S3Client({
  region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
  },
});

/**
 * GET /api/image-collection/proxy?url=...
 * Proxies image from S3 using server credentials so it loads in the browser
 * even when the bucket is private. Only allows URLs from the configured S3 bucket.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json({ error: 'Missing url' }, { status: 400 });
    }

    const allowedHost = `${BUCKET_NAME}.s3.${region}.amazonaws.com`;

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid url' }, { status: 400 });
    }

    if (parsed.hostname !== allowedHost) {
      return NextResponse.json({ error: 'URL not allowed' }, { status: 403 });
    }

    const key = parsed.pathname.startsWith('/') ? parsed.pathname.slice(1) : parsed.pathname;

    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const response = await s3.send(command);
    const body = response.Body;
    const contentType = response.ContentType || 'image/jpeg';

    if (!body) {
      return new NextResponse(null, { status: 404 });
    }

    const bytes = await body.transformToByteArray();
    const copy = new Uint8Array(bytes.length);
    copy.set(bytes);

    return new NextResponse(new Blob([copy]), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('[image-collection/proxy] Error:', error);
    return NextResponse.json(
      { error: 'Failed to load image' },
      { status: 500 }
    );
  }
}
