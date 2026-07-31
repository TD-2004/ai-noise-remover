import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { audioJobs } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

    const [job] = await db
      .select({
        id: audioJobs.id,
        originalFilename: audioJobs.originalFilename,
        originalFileSize: audioJobs.originalFileSize,
        processedFilename: audioJobs.processedFilename,
        processedFileSize: audioJobs.processedFileSize,
        status: audioJobs.status,
        errorMessage: audioJobs.errorMessage,
        createdAt: audioJobs.createdAt,
        completedAt: audioJobs.completedAt,
      })
      .from(audioJobs)
      .where(eq(audioJobs.id, jobId));

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(job);

  } catch (error) {
    console.error('Status error:', error);
    return NextResponse.json(
      { error: 'Failed to get job status' },
      { status: 500 }
    );
  }
}
