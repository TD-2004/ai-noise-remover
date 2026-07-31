import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { audioJobs } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    if (!filename.startsWith('processed_')) {
      return NextResponse.json(
        { error: 'Invalid filename' },
        { status: 400 }
      );
    }

    const [job] = await db
      .select()
      .from(audioJobs)
      .where(eq(audioJobs.processedFilename, filename));

    if (!job || !job.processedData) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    const data = job.processedData as unknown as Buffer;

    return new NextResponse(new Uint8Array(data), {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': data.length.toString(),
        'Accept-Ranges': 'bytes',
      },
    });

  } catch (error) {
    console.error('Play processed error:', error);
    return NextResponse.json(
      { error: 'Failed to load audio file' },
      { status: 500 }
    );
  }
}
