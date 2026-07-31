import { NextResponse } from 'next/server';
import { db } from '@/db';
import { audioJobs } from '@/db/schema';
import { desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const jobs = await db
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
      .orderBy(desc(audioJobs.createdAt))
      .limit(50);

    return NextResponse.json({ jobs });
  } catch (error) {
    console.error('History error:', error);
    return NextResponse.json(
      { error: 'Failed to get history' },
      { status: 500 }
    );
  }
}
