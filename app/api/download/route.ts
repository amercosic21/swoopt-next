import { NextRequest, NextResponse } from 'next/server';
import { validateUrl, validateFormat, validateType } from '@/lib/Sanitizer';
import { createJob, updateJob, countByStatus, purgeExpired, getByStatus } from '@/lib/JobManager';
import { dispatch } from '@/lib/Downloader';
import { MAX_CONCURRENT_JOBS } from '@/lib/config';

export async function POST(req: NextRequest) {
  try {
    const input = await req.json().catch(() => ({}));

    const url    = validateUrl(input.url ?? '');
    const format = validateFormat(input.format ?? 'mp4_best');
    const type   = validateType(input.type ?? 'single');

    // Thumbnail metadata from frontend
    const thumbData: Record<string, string> = {};
    if (typeof input.thumbnail_title === 'string' && input.thumbnail_title) {
      if (typeof input.thumbnail_url === 'string') thumbData.thumbnail_url = input.thumbnail_url.slice(0, 2000);
      thumbData.thumbnail_title = input.thumbnail_title.slice(0, 500);
      if (typeof input.thumbnail_channel === 'string') thumbData.thumbnail_channel = input.thumbnail_channel.slice(0, 200);
      if (typeof input.thumbnail_duration === 'string') thumbData.thumbnail_duration = input.thumbnail_duration.slice(0, 20);
    }

    purgeExpired();

    // Clean up stale "running" jobs whose worker process is no longer alive
    try {
      const runningJobs = getByStatus('running', 50);
      for (const rj of runningJobs) {
        if (rj.pid) {
          try { process.kill(rj.pid, 0); } catch {
            updateJob(rj.id, { status: 'failed', error: 'Download interrupted. Please try again.' });
          }
        } else {
          // No PID recorded — stale from a failed spawn
          const age = Math.floor(Date.now() / 1000) - rj.updated_at;
          if (age > 30) {
            updateJob(rj.id, { status: 'failed', error: 'Download interrupted. Please try again.' });
          }
        }
      }
    } catch { /* non-fatal */ }

    const activeRunning = countByStatus('running');

    const job = createJob(url, format, type);

    if (Object.keys(thumbData).length > 0) {
      updateJob(job.id, {
        thumbnail_url: thumbData.thumbnail_url,
        thumbnail_title: thumbData.thumbnail_title,
        thumbnail_channel: thumbData.thumbnail_channel,
        thumbnail_duration: thumbData.thumbnail_duration,
        current_title: thumbData.thumbnail_title || '',
      });
    }

    const response: Record<string, unknown> = { job_id: job.id, status: job.status };
    if (Object.keys(thumbData).length > 0) response.meta = thumbData;

    if (activeRunning >= MAX_CONCURRENT_JOBS) {
      const queuePos = countByStatus('queued');
      response.queue_pos = queuePos;
      response.status = 'queued';
    } else {
      dispatch(job.id);
    }

    return NextResponse.json(response);
  } catch (err) {
    if (err instanceof Error && err.message.includes('not supported')) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'A server error occurred.' }, { status: 500 });
  }
}
