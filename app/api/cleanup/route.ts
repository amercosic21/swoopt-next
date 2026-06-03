import { NextRequest, NextResponse } from 'next/server';
import { getJob, updateJob } from '@/lib/JobManager';
import { apiError, readJobIdBody, removeOutputDir } from '@/lib/apiHelpers';

export async function POST(req: NextRequest) {
  try {
    const jobId = await readJobIdBody(req);
    const job = getJob(jobId);

    if (job.status !== 'completed') {
      return NextResponse.json({ error: 'Job is not completed.' }, { status: 409 });
    }

    removeOutputDir(job);
    updateJob(jobId, { files: [], cleaned: true });
    return NextResponse.json({ success: true });
  } catch (err) {
    return apiError(err);
  }
}
