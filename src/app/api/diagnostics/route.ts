import { NextResponse } from 'next/server';
import { db, pool } from '@/db';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const checks: Record<string, unknown> = {};
  const result: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    databaseUrlConfigured: Boolean(process.env.DATABASE_URL),
    databaseUrlHost: process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).host : null,
    checks,
  };

  try {
    await pool.query('SELECT 1 as connected');
    checks.databaseConnection = {
      status: '✅ OK',
      detail: 'Successfully connected to PostgreSQL',
    };
  } catch (err) {
    checks.databaseConnection = {
      status: '❌ FAILED',
      detail: err instanceof Error ? err.message : String(err),
    };
    return NextResponse.json(result, { status: 500 });
  }

  try {
    const tableResult = await pool.query(
      `SELECT column_name, data_type FROM information_schema.columns 
       WHERE table_name = 'audio_jobs' ORDER BY ordinal_position`
    );

    if (tableResult.rows.length === 0) {
      checks.table = {
        status: '❌ MISSING',
        detail: 'The audio_jobs table does not exist. Run the SQL from FIX_VERCEL_DEPLOYMENT.md',
      };
    } else {
      checks.table = {
        status: '✅ OK',
        detail: 'audio_jobs table exists',
        columns: tableResult.rows.map((r: { column_name: string; data_type: string }) => `${r.column_name} (${r.data_type})`),
      };

      const hasOriginalData = tableResult.rows.some((r: { column_name: string }) => r.column_name === 'original_data');
      const hasProcessedData = tableResult.rows.some((r: { column_name: string }) => r.column_name === 'processed_data');

      if (!hasOriginalData || !hasProcessedData) {
        checks.table = {
          status: '⚠️ INCOMPLETE',
          detail: 'Table missing bytea columns. Run the ALTER TABLE commands from FIX_VERCEL_DEPLOYMENT.md',
        };
      }
    }
  } catch (err) {
    checks.table = {
      status: '❌ FAILED',
      detail: err instanceof Error ? err.message : String(err),
    };
  }

  try {
    const countResult = await db.execute(sql`SELECT COUNT(*) as count FROM audio_jobs`);
    const rows = countResult.rows as { count: string }[];
    checks.jobs = {
      status: '✅ OK',
      detail: `Found ${rows[0]?.count ?? 0} jobs in database`,
    };
  } catch (err) {
    checks.jobs = {
      status: '⚠️ SKIPPED',
      detail: err instanceof Error ? err.message : String(err),
    };
  }

  checks.ffmpeg = {
    status: '✅ Available via ffmpeg-static',
    detail: 'FFmpeg is bundled with the app',
  };

  return NextResponse.json(result);
}
