import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { validateJobId } from '@/lib/Sanitizer';
import { getJob, updateJob } from '@/lib/JobManager';

export async function POST(req: NextRequest) {
  try {
    const input = await req.json().catch(() => ({}));
    const jobId = validateJobId(input.job_id ?? '');
    const job = getJob(jobId);

    if (job.status !== 'running') {
      return NextResponse.json({ error: 'Only running jobs can be paused.' }, { status: 409 });
    }

    if (job.pid) {
      try {
        if (process.platform === 'win32') {
          execSync(`taskkill /F /T /PID ${job.pid}`, { stdio: 'ignore' });
        } else {
          process.kill(-job.pid, 'SIGKILL');
        }
      } catch { /* already dead */ }
    }

    updateJob(jobId, { status: 'paused' });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message.includes('not found')) {
      return NextResponse.json({ error: 'Job not found.' }, { status: 404 });
    }
    if (err instanceof Error) return NextResponse.json({ error: err.message }, { status: 400 });
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
