import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { audioJobs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import { v4 as uuidv4 } from 'uuid';
import { stat } from 'fs/promises';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes timeout

// Set ffmpeg path - resolve the actual path
const ffmpegPath = path.join(process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const PROCESSED_DIR = path.join(process.cwd(), 'public', 'processed');

async function removeBackgroundNoise(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .audioFilters([
        // STAGE 1: NOISE REMOVAL
        // Remove low-frequency rumble (below human voice)
        'highpass=f=80',
        
        // First pass FFT denoiser - removes constant background noise (fan, AC, hum)
        'afftdn=nf=-20',
        
        // Remove constant noise patterns (works great for fan/AC)
        'anlmdn=s=0.00001:p=0.002:r=0.002:m=15',
        
        // Noise gate to remove quiet background noise and breath sounds
        'agate=threshold=0.025:ratio=2.5:attack=20:release=250',
        
        // Second pass FFT denoiser for residual hiss and air noise
        'afftdn=nf=-25',
        
        // Remove ultra-high frequencies (hiss, air noise)
        'lowpass=f=12000',
        
        // De-reverb filter - removes echo and room reverb
        'afftdn=nf=-30:nt=w',
        
        // STAGE 2: VOICE SWEETENING (Broadcast Quality)
        
        // Remove harsh sibilance (reduce harsh "S" sounds) - makes voice sweet
        'deesser=i=0.15:m=0.6:f=0.5:s=o',
        
        // Add warmth - boost low-mids for fuller, warmer voice (200-400Hz)
        'equalizer=f=250:width_type=o:width=1.5:g=4',
        
        // Enhance presence - boost 1-2kHz for clarity without harshness
        'equalizer=f=1500:width_type=o:width=1.2:g=3',
        
        // Reduce harsh frequencies - cut 2.5-4kHz (reduces ear fatigue)
        'equalizer=f=3000:width_type=o:width=1.5:g=-2',
        
        // Add slight bass for fuller sound (makes voice richer)
        'bass=g=3:f=100:width_type=o:width=1',
        
        // Enhance vocal "air" - gentle boost at 8-10kHz for sweetness
        'equalizer=f=9000:width_type=o:width=1:g=1.5',
        
        // Multi-band compression for natural, sweet voice
        'acompressor=threshold=0.125:ratio=2.5:attack=15:release=200:makeup=2',
        
        // Gentle limiter to prevent peaks (smooth sound)
        'alimiter=limit=0.95:attack=5:release=50',
        
        // Final loudness normalization (broadcast standard)
        'loudnorm=I=-16:TP=-1.5:LRA=11'
      ])
      .audioCodec('libmp3lame')
      .audioBitrate('192k')
      .audioChannels(2)  // Stereo for sweeter, more pleasant sound
      .audioFrequency(44100)
      .on('start', (cmd) => console.log('FFmpeg command:', cmd))
      .on('progress', (progress) => console.log('Processing:', progress.percent + '% done'))
      .on('end', () => {
        console.log('FFmpeg processing finished - Sweet broadcast-quality voice applied');
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

    // Get job from database
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
      });
    }

    // Update status to processing
    await db.update(audioJobs)
      .set({ status: 'processing' })
      .where(eq(audioJobs.id, jobId));

    // Process audio
    const inputPath = path.join(UPLOAD_DIR, job.originalFilename);
    const outputFilename = `processed_${uuidv4()}.mp3`;
    const outputPath = path.join(PROCESSED_DIR, outputFilename);

    try {
      console.log('Starting audio processing...', { inputPath, outputPath });
      await removeBackgroundNoise(inputPath, outputPath);
      console.log('Audio processing completed');

      // Get processed file size
      const stats = await stat(outputPath);

      // Update job as completed
      await db.update(audioJobs)
        .set({
          status: 'completed',
          processedFilename: outputFilename,
          processedFileSize: stats.size,
          completedAt: new Date(),
        })
        .where(eq(audioJobs.id, jobId));

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
      console.error('Error details:', errorDetails);
      
      // Update job as failed
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
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
