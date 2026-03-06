import { NextRequest, NextResponse } from 'next/server';
import { validateJobId } from '@/lib/Sanitizer';
import { getJob, updateJob, countByStatus } from '@/lib/JobManager';
import { dispatch } from '@/lib/Downloader';
import { MAX_CONCURRENT_JOBS } from '@/lib/config';

export async function POST(req: NextRequest) {
  try {
    const input = await req.json().catch(() => ({}));
    const jobId = validateJobId(input.job_id ?? '');
    const job = getJob(jobId);

    if (job.status !== 'paused') {
      return NextResponse.json({ error: 'Only paused jobs can be resumed.' }, { status: 409 });
    }

    const activeRunning = countByStatus('running');
    if (activeRunning >= MAX_CONCURRENT_JOBS) {
      updateJob(jobId, { status: 'queued' });
      return NextResponse.json({ success: true, status: 'queued' });
    }

    updateJob(jobId, { status: 'running', phase: 'resuming' });
    dispatch(jobId);

    return NextResponse.json({ success: true, status: 'running' });
  } catch (err) {
    if (err instanceof Error && err.message.includes('not found')) {
      return NextResponse.json({ error: 'Job not found.' }, { status: 404 });
    }
    if (err instanceof Error) return NextResponse.json({ error: err.message }, { status: 400 });
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
