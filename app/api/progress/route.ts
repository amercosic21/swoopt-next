import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { validateJobId } from '@/lib/Sanitizer';
import { getJob } from '@/lib/JobManager';
import { BASE_DIR } from '@/lib/config';

export async function GET(req: NextRequest) {
  try {
    const jobId = validateJobId(req.nextUrl.searchParams.get('job_id') ?? '');
    const job = getJob(jobId);

    // For running/paused playlists, scan for completed files in real-time
    if (['running', 'paused'].includes(job.status) && job.type === 'playlist') {
      const dir = job.output_dir?.replace(/[\\/]+$/, '');
      if (dir && fs.existsSync(dir)) {
        const completedFiles: string[] = [];

        for (const entry of fs.readdirSync(dir)) {
          const fullPath = path.join(dir, entry);
          if (!fs.statSync(fullPath).isFile()) continue;
          if (entry.endsWith('.part') || entry.endsWith('.json') || entry.endsWith('.txt') ||
              entry.endsWith('.ytdl') || entry.endsWith('.temp') ||
              /\.temp\.\w+$/.test(entry) || /\.f\d+\.\w+$/.test(entry)) continue;
          try {
            if (fs.statSync(fullPath).size < 10240) continue;
          } catch { continue; }
          completedFiles.push(fullPath);
        }

        const webReadyFiles = completedFiles.map(f =>
          f.replace(/\\/g, '/').replace(BASE_DIR.replace(/\\/g, '/'), '')
        );

        return NextResponse.json({ ...job, ready_files: webReadyFiles, file_urls: job.files || [] });
      }
    }

    return NextResponse.json({ ...job, file_urls: job.files || [] });
  } catch (err) {
    if (err instanceof Error && err.message.includes('not found')) {
      return NextResponse.json({ error: 'Job not found.' }, { status: 404 });
    }
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
