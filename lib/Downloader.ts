import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { YTDLP_BIN, FFMPEG_BIN, NODE_BIN, BASE_DIR } from './config';
import { getJob, updateJob } from './JobManager';
import { getSettings, incrementStats } from './Settings';
import { resolveFormat } from './FormatResolver';
import type { Job } from '@/types';

const WORKER_PATH = path.join(BASE_DIR, 'worker', 'worker.ts');
// Run tsx CLI directly via node — avoids .cmd shim and CMD window on Windows
const TSX_CLI = path.join(BASE_DIR, 'node_modules', 'tsx', 'dist', 'cli.mjs');

export function dispatch(jobId: string): void {
  // Use configured NODE_BIN, falling back to the current process's node binary
  const nodeBin = NODE_BIN && NODE_BIN !== 'node' ? NODE_BIN : process.execPath;
  const child = spawn(nodeBin, [TSX_CLI, WORKER_PATH, jobId], {
    detached: process.platform !== 'win32',
    stdio: 'ignore',
    windowsHide: true,
  });
  child.on('error', (err) => {
    console.error(`[dispatch] Spawn error for ${jobId}:`, err.message);
    try {
      updateJob(jobId, { status: 'failed', error: 'Download could not start. Please try again.' });
    } catch { /* ignore */ }
  });
  child.unref();
}

export async function run(jobId: string): Promise<void> {
  const job = getJob(jobId);
  const isResume = !!job.has_started;

  const resumeUpdate: Partial<Job> = {
    status: 'running',
    pid: process.pid,
    has_started: true,
  };

  if (isResume) {
    resumeUpdate.download_speed = null;
    resumeUpdate.downloaded_size = null;
    resumeUpdate.total_size = null;
    resumeUpdate.stream = null;
    resumeUpdate.phase = 'resuming';
  } else {
    resumeUpdate.phase = 'downloading';
  }

  updateJob(jobId, resumeUpdate);

  const settings = getSettings();
  const formatFlags = resolveFormat(job.format);

  // Fetch metadata if not resuming
  if (!isResume) {
    const meta = await fetchMetadata(job.url, formatFlags);
    if (Object.keys(meta).length > 0) {
      const update: Partial<Job> = {};
      if (meta.title) update.current_title = meta.title;
      if (meta.thumbnail && !job.thumbnail_url) update.thumbnail_url = meta.thumbnail;
      if (meta.channel && !job.thumbnail_channel) update.thumbnail_channel = meta.channel;
      if (meta.duration_str && !job.thumbnail_duration) update.thumbnail_duration = meta.duration_str;
      if (meta.filesize) update.meta_filesize = parseInt(meta.filesize, 10);
      if (Object.keys(update).length > 0) updateJob(jobId, update);
    }
  }

  // Check if cancelled during metadata fetch
  const jobAfterMeta = getJob(jobId);
  if (jobAfterMeta.status === 'cancelled') return;

  const outputTemplate = job.type === 'playlist'
    ? path.join(job.output_dir, '%(playlist_index)s - %(title)s.%(ext)s')
    : path.join(job.output_dir, '%(title)s.%(ext)s');

  const args: string[] = [];

  if (FFMPEG_BIN && FFMPEG_BIN !== 'ffmpeg') {
    args.push('--ffmpeg-location', FFMPEG_BIN);
  }

  if (process.platform === 'win32' && NODE_BIN) {
    args.push('--js-runtimes', `node:${NODE_BIN}`);
  }

  args.push(
    '--newline',
    '--progress',
    '--no-warnings',
    '--ignore-errors',
    '-c',
    '--output', outputTemplate,
    ...formatFlags,
  );

  if (job.type === 'playlist') {
    const archiveFile = path.join(job.output_dir, '.archive.txt');
    args.push('--yes-playlist', '--download-archive', archiveFile);
  } else {
    args.push('--no-playlist');
  }

  if (settings.subtitles) {
    args.push('--write-subs', '--write-auto-subs', '--sub-langs', 'en', '--convert-subs', 'srt');
  }
  if (settings.embed_metadata) args.push('--embed-metadata');
  if (settings.embed_thumbnail) args.push('--embed-thumbnail');
  if (settings.rate_limit) args.push('--limit-rate', settings.rate_limit);
  if (settings.cookies_browser) args.push('--cookies-from-browser', settings.cookies_browser);

  args.push(job.url);

  await new Promise<void>((resolve) => {
    const proc = spawn(YTDLP_BIN, args, { stdio: ['ignore', 'pipe', 'pipe'] });

    updateJob(jobId, { pid: proc.pid ?? null });

    let stderrOutput = '';

    proc.stdout.on('data', (chunk: Buffer) => {
      for (const line of chunk.toString().split('\n')) {
        parseLine(line.trim(), jobId);
      }
    });

    proc.stderr.on('data', (chunk: Buffer) => {
      stderrOutput += chunk.toString();
    });

    proc.on('close', (exitCode) => {
      const currentJob = getJob(jobId);
      if (currentJob.status === 'cancelled') {
        resolve();
        return;
      }

      const dir = job.output_dir.replace(/[\\/]+$/, '');
      const downloadableFiles: string[] = [];

      if (fs.existsSync(dir)) {
        for (const entry of fs.readdirSync(dir)) {
          const fullPath = path.join(dir, entry);
          if (
            fs.statSync(fullPath).isFile() &&
            !entry.endsWith('.json') &&
            !entry.endsWith('.part') &&
            !entry.endsWith('.txt') &&
            !entry.endsWith('.ytdl') &&
            !entry.endsWith('.temp')
          ) {
            downloadableFiles.push(fullPath);
          }
        }
      }

      const webFiles = downloadableFiles.map(f =>
        f.replace(/\\/g, '/').replace(BASE_DIR.replace(/\\/g, '/'), '')
      );

      const totalBytes = downloadableFiles.reduce((sum, f) => {
        try { return sum + fs.statSync(f).size; } catch { return sum; }
      }, 0);

      if (downloadableFiles.length > 0) {
        updateJob(jobId, {
          status: 'completed',
          progress: 100,
          files: webFiles,
          warning: exitCode !== 0 ? 'Some items were skipped (unavailable or private).' : null,
        });
        try { incrementStats(downloadableFiles.length, totalBytes); } catch { /* non-fatal */ }
      } else {
        updateJob(jobId, {
          status: 'failed',
          error: stderrOutput.trim() || `yt-dlp exited with code ${exitCode}`,
        });
      }

      resolve();
    });
  });
}

async function fetchMetadata(url: string, formatFlags: string[] = []): Promise<Record<string, string>> {
  return new Promise((resolve) => {
    const args = [];

    if (FFMPEG_BIN) args.push('--ffmpeg-location', FFMPEG_BIN);
    if (process.platform === 'win32' && NODE_BIN) args.push('--js-runtimes', `node:${NODE_BIN}`);

    // Include format flags so yt-dlp resolves the same formats and reports
    // accurate filesize / filesize_approx for the selected streams.
    args.push(...formatFlags);
    args.push('--dump-json', '--skip-download', '--no-warnings', '--playlist-items', '1', url);

    const proc = spawn(YTDLP_BIN, args, { stdio: ['ignore', 'pipe', 'ignore'] });
    let output = '';

    proc.stdout.on('data', (chunk: Buffer) => { output += chunk.toString(); });

    proc.on('close', () => {
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
        if (duration > 0) {
          const h = Math.floor(duration / 3600);
          const m = Math.floor((duration % 3600) / 60);
          const s = duration % 60;
          result.duration_str = h > 0
            ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
            : `${m}:${String(s).padStart(2, '0')}`;
        }

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

    proc.on('error', () => resolve({}));
  });
}

/** Convert raw bytes to a human-friendly size + unit matching yt-dlp's output (KiB/MiB/GiB). */
function humanSize(bytes: number): { size: number; unit: string } {
  if (bytes >= 1024 * 1024 * 1024) return { size: Math.round(bytes / (1024 * 1024 * 1024) * 100) / 100, unit: 'GiB' };
  if (bytes >= 1024 * 1024)         return { size: Math.round(bytes / (1024 * 1024) * 100) / 100, unit: 'MiB' };
  return { size: Math.round(bytes / 1024 * 100) / 100, unit: 'KiB' };
}

// Per-stream locked total size — prevents HLS/DASH estimated sizes from fluctuating.
// Cleared on Destination line (stream switch) and playlist item switch.
let _lockedTotal: { size: number; unit: string } | null = null;
// Cached metadata filesize (bytes) — avoids re-reading job JSON on every progress line.
let _cachedMetaFilesize: number | null | undefined = undefined;

function parseLine(line: string, jobId: string): void {
  if (!line) return;

  // Full progress line: [download] 45.3% of 12.34MiB at 1.23MiB/s ETA 00:08
  // Estimated sizes (HLS/DASH) have a ~ prefix: [download] 15% of ~13.59KiB
  const progressMatch = line.match(/\[download\]\s+([\d.]+)%\s+of\s+(~?)\s*([\d.]+)\s*([A-Za-z]+)/);
  if (progressMatch) {
    const pct = parseFloat(progressMatch[1]);
    const isEstimated = progressMatch[2] === '~';
    const reportedSize = parseFloat(progressMatch[3]);
    const reportedUnit = progressMatch[4];

    // For exact sizes (YouTube, SoundCloud): lock on first report.
    // For estimated sizes (HLS/DASH — Vimeo, etc.): prefer meta_filesize
    // from the pre-download metadata query; fall back to latest yt-dlp estimate.
    if (!isEstimated) {
      if (!_lockedTotal) {
        _lockedTotal = { size: reportedSize, unit: reportedUnit };
      }
    } else {
      // Check if we have a reliable total from metadata (cached to avoid disk reads)
      if (_cachedMetaFilesize === undefined) {
        _cachedMetaFilesize = getJob(jobId).meta_filesize ?? null;
      }
      const metaBytes = _cachedMetaFilesize;
      if (metaBytes && metaBytes > 0) {
        // Use metadata total — this is the combined size of all streams.
        // For merged downloads (video+audio), yt-dlp reports per-stream
        // progress so we show the full file total and derive downloaded
        // from the per-stream estimate scaled by percentage.
        const { size: metaSize, unit: metaUnit } = humanSize(metaBytes);
        _lockedTotal = { size: metaSize, unit: metaUnit };
      } else {
        // No metadata — use latest yt-dlp estimate (grows over time)
        _lockedTotal = { size: reportedSize, unit: reportedUnit };
      }
    }

    const totalSize = _lockedTotal.size;
    const totalUnit = _lockedTotal.unit;
    const downloaded = Math.round(totalSize * pct / 100 * 100) / 100;

    const update: Partial<Job> = {
      progress: pct,
      phase: 'downloading',
      downloaded_size: `${downloaded} ${totalUnit}`,
      total_size: `${totalSize} ${totalUnit}`,
    };

    const speedMatch = line.match(/at\s+([\d.]+\s*[A-Za-z/]+)/);
    if (speedMatch) update.download_speed = speedMatch[1].trim();

    updateJob(jobId, update);
    return;
  }

  // Fallback: percentage only
  const pctOnly = line.match(/\[download\]\s+([\d.]+)%/);
  if (pctOnly) {
    updateJob(jobId, { progress: parseFloat(pctOnly[1]), phase: 'downloading' });
    return;
  }

  // Playlist item counter
  const itemMatch = line.match(/Downloading item (\d+) of (\d+)/i);
  if (itemMatch) {
    const newItem = parseInt(itemMatch[1], 10);
    const totalItems = parseInt(itemMatch[2], 10);
    const current = getJob(jobId);
    if (newItem < (current.current_item || 0)) return;
    _lockedTotal = null; // reset for new playlist item
    updateJob(jobId, {
      current_item: newItem,
      total_items: totalItems,
      progress: 0,
      phase: 'downloading',
      stream: null,
      downloaded_size: null,
      total_size: null,
      download_speed: null,
    });
    return;
  }

  // Destination path — extract title and stream type
  const destMatch = line.match(/\[download\]\s+Destination:\s+.+[/\\]([^/\\]+)$/);
  if (destMatch) {
    const filename = destMatch[1];
    const audioExts = ['m4a', 'mp3', 'opus', 'ogg', 'wav', 'aac', 'flac', 'weba'];
    const ext = path.extname(filename).slice(1).toLowerCase();
    const hasDashAudio = filename.includes('.fdash-audio-');
    const stream = (hasDashAudio || audioExts.includes(ext)) ? 'audio' : 'video';

    let title = filename.replace(/\.[^.]+$/, '');
    title = title.replace(/\.f\d+$/, '');
    title = title.replace(/\.fdash-(?:audio|video)-\d+$/, '');
    title = title.replace(/\.fhls-\d+[\w-]*$/, '');
    title = title.replace(/^\d+\s+-\s+/, '');

    // Only update title from Destination if we don't already have a clean
    // metadata title (metadata titles are always better than filename-derived ones)
    const currentJob = getJob(jobId);
    const shouldUpdateTitle = title && !currentJob.current_title;

    _lockedTotal = null; // reset for new stream
    updateJob(jobId, {
      stream,
      downloaded_size: null,
      total_size: null,
      download_speed: null,
      ...(shouldUpdateTitle ? { current_title: title } : {}),
    });
    return;
  }

  // Merging
  if (line.includes('[Merger]') || line.includes('Merging formats')) {
    updateJob(jobId, { phase: 'merging', progress: 100 });
    return;
  }

  // Audio processing
  if (line.includes('[ExtractAudio]') || line.includes('[ffmpeg]') || line.includes('[AudioConvert]')) {
    const current = getJob(jobId);
    if (current.phase !== 'resuming') updateJob(jobId, { phase: 'processing' });
    return;
  }

  // Already downloaded
  if (line.includes('[download]') && line.includes('has already been downloaded')) {
    updateJob(jobId, { progress: 100 });
    return;
  }

  // Archive skip (playlist resume): item was already downloaded, ignore
  if (line.includes('has already been recorded in the archive')) {
    return;
  }
}
