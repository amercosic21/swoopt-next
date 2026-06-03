import { NextRequest, NextResponse } from 'next/server';
import { getJob, deleteJob } from '@/lib/JobManager';
import { apiError, readJobIdBody, removeOutputDir } from '@/lib/apiHelpers';

export async function POST(req: NextRequest) {
  try {
    const jobId = await readJobIdBody(req);
    const job = getJob(jobId);

    if (!['completed', 'failed', 'cancelled'].includes(job.status)) {
      return NextResponse.json({ error: 'Cannot delete an active job. Cancel it first.' }, { status: 409 });
    }

    removeOutputDir(job);
    deleteJob(jobId);
    return NextResponse.json({ success: true });
  } catch (err) {
    return apiError(err);
  }
}
