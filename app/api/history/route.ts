import { NextRequest, NextResponse } from 'next/server';
import { getAllJobs } from '@/lib/JobManager';

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const limit  = Math.min(100, Math.max(1, parseInt(params.get('limit')  ?? '20', 10)));
    const offset = Math.max(0, parseInt(params.get('offset') ?? '0', 10));

    const jobs = getAllJobs(limit, offset);

    // file_urls same as files (they're web paths stored relative to BASE_DIR)
    const enriched = jobs.map(job => ({
      ...job,
      file_urls: job.files || [],
    }));

    return NextResponse.json({ jobs: enriched, total: enriched.length, limit, offset });
  } catch {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
