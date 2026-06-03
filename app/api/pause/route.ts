import { NextRequest, NextResponse } from 'next/server';
import { getJob, updateJob } from '@/lib/JobManager';
import { apiError, readJobIdBody, killProcess } from '@/lib/apiHelpers';

export async function POST(req: NextRequest) {
  try {
    const jobId = await readJobIdBody(req);
    const job = getJob(jobId);

    if (job.status !== 'running') {
      return NextResponse.json({ error: 'Only running jobs can be paused.' }, { status: 409 });
    }

    killProcess(job.pid);
    updateJob(jobId, { status: 'paused' });
    return NextResponse.json({ success: true });
  } catch (err) {
    return apiError(err);
  }
}
