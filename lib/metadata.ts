import { spawn } from 'child_process';
import { YTDLP_BIN, FFMPEG_BIN, NODE_BIN } from './config';
import { getJob, updateJob } from './JobManager';
import { formatDuration } from '@/utils/format';
import type { Job } from '@/types';

/**
 * Best-effort background enrichment: fetches title/thumbnail/filesize and merges
 * them into the job without blocking the download. Skips fields the frontend
 * already provided and bails if the job was cancelled/finished meanwhile.
 */
export async function enrichJobMetadata(jobId: string, url: string, formatFlags: string[]): Promise<void> {
  try {
    const meta = await fetchMetadata(url, formatFlags);
    if (Object.keys(meta).length === 0) return;

    const job = getJob(jobId);
    if (job.status === 'cancelled' || job.status === 'completed' || job.status === 'failed') return;

    const update: Partial<Job> = {};
    if (meta.title) update.current_title = meta.title;
    if (meta.thumbnail && !job.thumbnail_url) update.thumbnail_url = meta.thumbnail;
    if (meta.channel && !job.thumbnail_channel) update.thumbnail_channel = meta.channel;
    if (meta.duration_str && !job.thumbnail_duration) update.thumbnail_duration = meta.duration_str;
    if (meta.filesize) update.meta_filesize = parseInt(meta.filesize, 10);
    if (Object.keys(update).length > 0) updateJob(jobId, update);
  } catch { /* metadata is best-effort — never fail the download over it */ }
}

/** Runs `yt-dlp --dump-json` for the first item and extracts the fields we display. */
export function fetchMetadata(url: string, formatFlags: string[] = []): Promise<Record<string, string>> {
  return new Promise((resolve) => {
    const args: string[] = [];

    if (FFMPEG_BIN) args.push('--ffmpeg-location', FFMPEG_BIN);
    if (process.platform === 'win32' && NODE_BIN) args.push('--js-runtimes', `node:${NODE_BIN}`);

    // Include format flags so yt-dlp resolves the same formats and reports
    // accurate filesize / filesize_approx for the selected streams.
    args.push(...formatFlags);
    args.push('--dump-json', '--skip-download', '--no-warnings', '--playlist-items', '1', url);

    const proc = spawn(YTDLP_BIN, args, { stdio: ['ignore', 'pipe', 'ignore'] });
    let output = '';

    // Guard against a hung yt-dlp (weird URL): kill it after 30s so the
    // caller never waits forever. The close handler resolves with whatever
    // was captured (usually nothing), which yields an empty result.
    const killTimer = setTimeout(() => { try { proc.kill(); } catch { /* already gone */ } }, 30_000);

    proc.stdout.on('data', (chunk: Buffer) => { output += chunk.toString(); });

    proc.on('close', () => {
      clearTimeout(killTimer);
      try {
        const json = JSON.parse(output.trim());
        const result: Record<string, string> = {};

        const title = String(json.title || '').trim();
        const thumbnail = String(json.thumbnail || '').trim();
        const channel = String(json.channel || json.uploader || '').trim();
        const duration = parseInt(json.duration || '0', 10);

        if (title) result.title = title.slice(0, 500);
        if (thumbnail && thumbnail !== 'NA') result.thumbnail = thumbnail.slice(0, 2000);
        if (channel && channel !== 'NA') result.channel = channel.slice(0, 200);
        const durationStr = formatDuration(duration);
        if (durationStr) result.duration_str = durationStr;

        // Extract total filesize from requested_formats (video+audio merge) or
        // top-level filesize/filesize_approx (single stream).  This gives us an
        // accurate total BEFORE the download starts — critical for HLS/DASH
        // sources (Vimeo, etc.) where yt-dlp only has a rough fragment estimate.
        let totalBytes = 0;
        if (Array.isArray(json.requested_formats)) {
          for (const fmt of json.requested_formats) {
            totalBytes += fmt.filesize || fmt.filesize_approx || 0;
          }
        }
        if (!totalBytes) {
          totalBytes = json.filesize || json.filesize_approx || 0;
        }
        if (totalBytes > 0) {
          result.filesize = String(Math.round(totalBytes));
        }

        resolve(result);
      } catch {
        resolve({});
      }
    });

    proc.on('error', () => { clearTimeout(killTimer); resolve({}); });
  });
}
