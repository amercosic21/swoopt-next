import { NextRequest, NextResponse } from 'next/server';
import { getJob, updateJob, countByStatus } from '@/lib/JobManager';
import { dispatch } from '@/lib/Downloader';
import { MAX_CONCURRENT_JOBS } from '@/lib/config';
import { apiError, readJobIdBody } from '@/lib/apiHelpers';

export async function POST(req: NextRequest) {
  try {
    const jobId = await readJobIdBody(req);
    const job = getJob(jobId);

    if (job.status !== 'paused') {
      return NextResponse.json({ error: 'Only paused jobs can be resumed.' }, { status: 409 });
    }

    if (countByStatus('running') >= MAX_CONCURRENT_JOBS) {
      updateJob(jobId, { status: 'queued' });
      return NextResponse.json({ success: true, status: 'queued' });
    }

    updateJob(jobId, { status: 'running', phase: 'resuming' });
    dispatch(jobId);

    return NextResponse.json({ success: true, status: 'running' });
  } catch (err) {
    return apiError(err);
  }
}
