import { NextRequest, NextResponse } from 'next/server';
import { getJob, updateJob, countByStatus, getByStatus } from '@/lib/JobManager';
import { dispatch } from '@/lib/Downloader';
import { MAX_CONCURRENT_JOBS } from '@/lib/config';
import { apiError, readJobIdBody, removeOutputDir, killProcess } from '@/lib/apiHelpers';

export async function POST(req: NextRequest) {
  try {
    const jobId = await readJobIdBody(req);
    const job = getJob(jobId);

    if (['completed', 'failed', 'cancelled'].includes(job.status)) {
      return NextResponse.json({ success: true, message: 'Job already finished.' });
    }

    killProcess(job.pid);
    updateJob(jobId, { status: 'cancelled' });
    removeOutputDir(job);

    // Free the slot for the next queued job
    try {
      if (countByStatus('running') < MAX_CONCURRENT_JOBS) {
        const queued = getByStatus('queued', 1);
        if (queued.length > 0) dispatch(queued[0].id);
      }
    } catch { /* non-fatal */ }

    return NextResponse.json({ success: true });
  } catch (err) {
    return apiError(err);
  }
}
