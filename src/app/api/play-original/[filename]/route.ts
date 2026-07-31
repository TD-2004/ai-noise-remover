import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { audioJobs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import path from 'path';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    if (!filename.match(/^[a-f0-9-]+\.(mp3|wav|ogg|webm|m4a|aac|mp4)$/i)) {
      return NextResponse.json(
        { error: 'Invalid filename' },
        { status: 400 }
      );
    }

    const [job] = await db
      .select()
      .from(audioJobs)
      .where(eq(audioJobs.originalFilename, filename));

    if (!job || !job.originalData) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg',
      '.webm': 'audio/webm',
      '.m4a': 'audio/mp4',
      '.aac': 'audio/aac',
      '.mp4': 'audio/mp4',
    };
    const contentType = mimeTypes[ext] || 'audio/mpeg';

    const data = job.originalData as unknown as Buffer;

    return new NextResponse(new Uint8Array(data), {
      headers: {
        'Content-Type': contentType,
        'Content-Length': data.length.toString(),
        'Accept-Ranges': 'bytes',
      },
    });

  } catch (error) {
    console.error('Play original error:', error);
    return NextResponse.json(
      { error: 'Failed to load audio file' },
      { status: 500 }
    );
  }
}
