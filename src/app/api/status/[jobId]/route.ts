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

    const [job] = await db.select().from(audioJobs).where(eq(audioJobs.id, jobId));

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: job.id,
      status: job.status,
      originalFilename: job.originalFilename,
      originalFileSize: job.originalFileSize,
      processedFilename: job.processedFilename,
      processedFileSize: job.processedFileSize,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    });

  } catch (error) {
    console.error('Status error:', error);
    return NextResponse.json(
      { error: 'Failed to get job status' },
      { status: 500 }
    );
  }
}
