import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { validateJobId } from '@/lib/Sanitizer';
import { getJob, updateJob } from '@/lib/JobManager';

export async function POST(req: NextRequest) {
  try {
    const input = await req.json().catch(() => ({}));
    const jobId = validateJobId(input.job_id ?? '');
    const job = getJob(jobId);

    if (job.status !== 'completed') {
      return NextResponse.json({ error: 'Job is not completed.' }, { status: 409 });
    }

    const outputDir = job.output_dir?.replace(/[\\/]+$/, '');
    if (outputDir && fs.existsSync(outputDir)) {
      for (const entry of fs.readdirSync(outputDir)) {
        try { fs.unlinkSync(path.join(outputDir, entry)); } catch { /* ignore */ }
      }
      try { fs.rmdirSync(outputDir); } catch { /* ignore */ }
    }

    updateJob(jobId, { files: [], cleaned: true });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message.includes('not found')) {
      return NextResponse.json({ error: 'Job not found.' }, { status: 404 });
    }
    if (err instanceof Error) return NextResponse.json({ error: err.message }, { status: 400 });
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
