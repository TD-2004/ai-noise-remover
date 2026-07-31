import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { audioJobs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import { v4 as uuidv4 } from 'uuid';
import { writeFile, readFile, mkdir, unlink, stat } from 'fs/promises';
import { existsSync } from 'fs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

// Set ffmpeg path
const ffmpegPath = path.join(process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);

// Vercel's only writable directory is /tmp
const TMP_DIR = path.join('/tmp', 'ai-noise-remover');

async function ensureTmpDir() {
  if (!existsSync(TMP_DIR)) {
    await mkdir(TMP_DIR, { recursive: true });
  }
}

async function removeBackgroundNoise(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .audioFilters([
        'highpass=f=80',
        'afftdn=nf=-20',
        'anlmdn=s=0.00001:p=0.002:r=0.002:m=15',
        'agate=threshold=0.025:ratio=2.5:attack=20:release=250',
        'afftdn=nf=-25',
        'lowpass=f=12000',
        'afftdn=nf=-30:nt=w',
        'deesser=i=0.15:m=0.6:f=0.5:s=o',
        'equalizer=f=250:width_type=o:width=1.5:g=4',
        'equalizer=f=1500:width_type=o:width=1.2:g=3',
        'equalizer=f=3000:width_type=o:width=1.5:g=-2',
        'bass=g=3:f=100:width_type=o:width=1',
        'equalizer=f=9000:width_type=o:width=1:g=1.5',
        'acompressor=threshold=0.125:ratio=2.5:attack=15:release=200:makeup=2',
        'alimiter=limit=0.95:attack=5:release=50',
        'loudnorm=I=-16:TP=-1.5:LRA=11'
      ])
      .audioCodec('libmp3lame')
      .audioBitrate('192k')
      .audioChannels(1)
      .audioFrequency(44100)
      .on('start', (cmd) => console.log('FFmpeg command:', cmd))
      .on('progress', (progress) => console.log('Processing:', progress.percent + '% done'))
      .on('end', () => {
        console.log('FFmpeg processing finished');
        resolve();
      })
      .on('error', (err, stdout, stderr) => {
        console.error('FFmpeg error:', err.message);
        console.error('FFmpeg stderr:', stderr);
        reject(err);
      })
      .save(outputPath);
  });
}

export async function POST(request: NextRequest) {
  try {
    const { jobId } = await request.json();

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    const [job] = await db.select().from(audioJobs).where(eq(audioJobs.id, jobId));

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    if (job.status === 'completed') {
      return NextResponse.json({
        success: true,
        status: 'completed',
        processedFilename: job.processedFilename,
        originalSize: job.originalFileSize,
        processedSize: job.processedFileSize,
      });
    }

    if (!job.originalData) {
      return NextResponse.json(
        { error: 'Original audio data not found in database' },
        { status: 400 }
      );
    }

    await db.update(audioJobs)
      .set({ status: 'processing' })
      .where(eq(audioJobs.id, jobId));

    await ensureTmpDir();

    const inputPath = path.join(TMP_DIR, job.originalFilename);
    const outputFilename = `processed_${uuidv4()}.mp3`;
    const outputPath = path.join(TMP_DIR, outputFilename);

    try {
      await writeFile(inputPath, job.originalData);
      await removeBackgroundNoise(inputPath, outputPath);
      const processedBuffer = await readFile(outputPath);
      const stats = await stat(outputPath);

      await db.update(audioJobs)
        .set({
          status: 'completed',
          processedFilename: outputFilename,
          processedFileSize: stats.size,
          processedData: processedBuffer,
          completedAt: new Date(),
        })
        .where(eq(audioJobs.id, jobId));

      await unlink(inputPath).catch(() => {});
      await unlink(outputPath).catch(() => {});

      return NextResponse.json({
        success: true,
        status: 'completed',
        processedFilename: outputFilename,
        originalSize: job.originalFileSize,
        processedSize: stats.size,
      });

    } catch (processingError) {
      console.error('Processing error:', processingError);
      const errorDetails = processingError instanceof Error ? processingError.message : String(processingError);
      
      await unlink(inputPath).catch(() => {});
      await unlink(outputPath).catch(() => {});

      await db.update(audioJobs)
        .set({
          status: 'failed',
          errorMessage: errorDetails,
        })
        .where(eq(audioJobs.id, jobId));

      return NextResponse.json(
        { error: 'Failed to process audio file', details: errorDetails },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Process error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Process failed: ${errorMessage}`, details: errorMessage },
      { status: 500 }
    );
  }
}
