import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { validateJobId } from '@/lib/Sanitizer';
import { getJob, updateJob, countByStatus, getByStatus } from '@/lib/JobManager';
import { dispatch } from '@/lib/Downloader';
import { MAX_CONCURRENT_JOBS } from '@/lib/config';

export async function POST(req: NextRequest) {
  try {
    const input = await req.json().catch(() => ({}));
    const jobId = validateJobId(input.job_id ?? '');
    const job = getJob(jobId);

    if (['completed', 'failed', 'cancelled'].includes(job.status)) {
      return NextResponse.json({ success: true, message: 'Job already finished.' });
    }

    // Kill process
    if (job.pid) {
      try {
        if (process.platform === 'win32') {
          execSync(`taskkill /F /T /PID ${job.pid}`, { stdio: 'ignore' });
        } else {
          process.kill(-job.pid, 'SIGKILL');
        }
      } catch { /* already dead */ }
    }

    updateJob(jobId, { status: 'cancelled' });

    // Clean output directory
    const outputDir = job.output_dir?.replace(/[\\/]+$/, '');
    if (outputDir && fs.existsSync(outputDir)) {
      for (const entry of fs.readdirSync(outputDir)) {
        try { fs.unlinkSync(path.join(outputDir, entry)); } catch { /* ignore */ }
      }
      try { fs.rmdirSync(outputDir); } catch { /* ignore */ }
    }

    // Dispatch next queued job
    try {
      const running = countByStatus('running');
      if (running < MAX_CONCURRENT_JOBS) {
        const queued = getByStatus('queued', 1);
        if (queued.length > 0) dispatch(queued[0].id);
      }
    } catch { /* non-fatal */ }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message.includes('not found')) {
      return NextResponse.json({ error: 'Job not found.' }, { status: 404 });
    }
    if (err instanceof Error) return NextResponse.json({ error: err.message }, { status: 400 });
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
