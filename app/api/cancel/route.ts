import { NextRequest, NextResponse } from 'next/server';
import { getJob, updateJob, requestStop } from '@/lib/JobManager';
import { apiError, readJobIdBody, removeOutputDir, killProcess } from '@/lib/apiHelpers';

export async function POST(req: NextRequest) {
  try {
    const jobId = await readJobIdBody(req);
    const job = getJob(jobId);

    if (['completed', 'failed', 'cancelled'].includes(job.status)) {
      return NextResponse.json({ success: true, message: 'Job already finished.' });
    }

    if (job.status === 'running') {
      // Signal the worker to cancel, then stop yt-dlp. The worker writes 'cancelled',
      // removes the partial, and dispatches the next queued job when its run ends.
      requestStop(jobId, 'cancel');
      killProcess(job.pid);
    } else {
      // queued or paused: no worker is running, so cancel directly.
      updateJob(jobId, { status: 'cancelled' });
      removeOutputDir(job);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return apiError(err);
  }
}
