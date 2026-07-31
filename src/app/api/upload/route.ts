import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { audioJobs } from '@/db/schema';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('audio') as File | null;

    console.log('Received file:', file?.name, file?.type, file?.size);

    if (!file || file.size === 0) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/wave',
      'audio/ogg', 'audio/webm', 'audio/m4a', 'audio/x-m4a', 'audio/mp4', 'audio/aac'
    ];
    const nameMatch = file.name.match(/\.(mp3|wav|ogg|webm|m4a|aac|mp4)$/i);
    if (!allowedTypes.includes(file.type) && !nameMatch) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload an audio file (MP3, WAV, OGG, WEBM, M4A)' },
        { status: 400 }
      );
    }

    // Validate file size - Vercel Hobby plan allows max 4.5MB request body
    const maxSize = 4 * 1024 * 1024; // 4MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum size is 4MB on the free plan. Please use a shorter audio clip.` },
        { status: 400 }
      );
    }

    // Generate unique filename
    const fileExtension = path.extname(file.name).toLowerCase();
    const uniqueFilename = `${uuidv4()}${fileExtension}`;

    // Convert file to buffer for database storage
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create database record with audio data stored in DB
    const [job] = await db.insert(audioJobs).values({
      originalFilename: uniqueFilename,
      originalFileSize: file.size,
      originalData: buffer,
      status: 'pending',
    }).returning();

    return NextResponse.json({
      success: true,
      jobId: job.id,
      message: 'File uploaded successfully',
    });

  } catch (error) {
    console.error('Upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Upload failed: ${errorMessage}`, details: errorMessage },
      { status: 500 }
    );
  }
}
