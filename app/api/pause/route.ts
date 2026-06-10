import { NextRequest, NextResponse } from 'next/server';
import { getJob, requestStop } from '@/lib/JobManager';
import { apiError, readJobIdBody, killProcess } from '@/lib/apiHelpers';

export async function POST(req: NextRequest) {
  try {
    const jobId = await readJobIdBody(req);
    const job = getJob(jobId);

    if (job.status !== 'running') {
      return NextResponse.json({ error: 'Only running jobs can be paused.' }, { status: 409 });
    }

    // Signal the worker to pause, then stop yt-dlp. The worker sees the signal in its
    // close handler and writes 'paused' itself — sole status writer, so no race.
    requestStop(jobId, 'pause');
    killProcess(job.pid);
    return NextResponse.json({ success: true });
  } catch (err) {
    return apiError(err);
  }
}
