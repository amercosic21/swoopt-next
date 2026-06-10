import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { YTDLP_BIN, FFMPEG_BIN, NODE_BIN, BASE_DIR } from './config';
import { getJob, updateJob, consumeStopSignal, clearStopSignals } from './JobManager';
import { getSettings, incrementStats } from './Settings';
import { resolveFormat, requestedHeight } from './FormatResolver';
import { enrichJobMetadata } from './metadata';
import { probeMaxHeight } from './probe';
import { parseLine } from './progress';
import type { Job } from '@/types';

const WORKER_PATH = path.join(BASE_DIR, 'worker', 'worker.ts');
// Run tsx CLI directly via node — avoids .cmd shim and CMD window on Windows
const TSX_CLI = path.join(BASE_DIR, 'node_modules', 'tsx', 'dist', 'cli.mjs');

/** Spawn a detached worker process to download the given job. */
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

/** Build the yt-dlp argument list for a job's download. */
function buildArgs(job: Job, formatFlags: string[]): string[] {
  const outputTemplate = job.type === 'playlist'
    ? path.join(job.output_dir, '%(playlist_index)s - %(title)s.%(ext)s')
    : path.join(job.output_dir, '%(title)s.%(ext)s');

  const args: string[] = [];

  if (FFMPEG_BIN && FFMPEG_BIN !== 'ffmpeg') args.push('--ffmpeg-location', FFMPEG_BIN);
  if (process.platform === 'win32' && NODE_BIN) args.push('--js-runtimes', `node:${NODE_BIN}`);

  args.push(
    '--newline',
    '--progress',
    '--no-warnings',
    '--ignore-errors',
    '-c',
    // Resilience against transient YouTube failures (JS-challenge / signature
    // extraction). Without retries a single hiccup makes the high-res DASH streams
    // unreachable and yt-dlp silently drops to a low-res progressive format — the
    // "downloaded quality is too low" bug.
    // --socket-timeout abandons a hung connection (instead of freezing) and retries;
    // --concurrent-fragments pulls several ranges in parallel for faster, more
    // throttle-resistant large DASH/YouTube downloads.
    '--socket-timeout', '30',
    '--concurrent-fragments', '4',
    '--retries', '10',
    '--fragment-retries', '10',
    '--extractor-retries', '3',
    '--output', outputTemplate,
    ...formatFlags,
  );

  if (job.type === 'playlist') {
    const archiveFile = path.join(job.output_dir, '.archive.txt');
    args.push('--yes-playlist', '--download-archive', archiveFile);
  } else {
    args.push('--no-playlist');
  }

  const settings = getSettings();
  if (settings.subtitles) {
    args.push('--write-subs', '--write-auto-subs', '--sub-langs', 'en', '--convert-subs', 'srt');
  }
  if (settings.embed_metadata) args.push('--embed-metadata');
  if (settings.embed_thumbnail) args.push('--embed-thumbnail');
  if (settings.rate_limit) args.push('--limit-rate', settings.rate_limit);
  if (settings.cookies_browser) args.push('--cookies-from-browser', settings.cookies_browser);

  args.push(job.url);
  return args;
}

/** List the deliverable output files in a job's directory (skips temp/sidecar files). */
function collectDownloadedFiles(outputDir: string): string[] {
  const dir = outputDir.replace(/[\\/]+$/, '');
  if (!fs.existsSync(dir)) return [];

  const skip = ['.json', '.part', '.txt', '.ytdl', '.temp'];
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    if (fs.statSync(fullPath).isFile() && !skip.some(ext => entry.endsWith(ext))) {
      files.push(fullPath);
    }
  }
  return files;
}

/** Finalize a finished job: record files/stats, or mark it failed. */
function finalizeJob(jobId: string, job: Job, exitCode: number | null, stderrOutput: string): void {
  const downloadableFiles = collectDownloadedFiles(job.output_dir);

  if (downloadableFiles.length === 0) {
    updateJob(jobId, {
      status: 'failed',
      error: stderrOutput.trim() || `yt-dlp exited with code ${exitCode}`,
    });
    return;
  }

  const baseDir = BASE_DIR.replace(/\\/g, '/');
  const webFiles = downloadableFiles.map(f => f.replace(/\\/g, '/').replace(baseDir, ''));
  const totalBytes = downloadableFiles.reduce((sum, f) => {
    try { return sum + fs.statSync(f).size; } catch { return sum; }
  }, 0);

  let warning: string | null = exitCode !== 0
    ? 'Some items were skipped (unavailable or private).'
    : null;

  // Quality safeguard: if the user asked for a real resolution but the delivered
  // video is 360p or lower, the source's high-res DASH streams were unreachable
  // (transient YouTube failure) and yt-dlp silently fell back to the low-res
  // progressive format. Surface this instead of passing it off as best quality.
  if (!warning) {
    const wantHeight = requestedHeight(job.format);
    if (wantHeight && wantHeight >= 480) {
      const gotHeight = probeMaxHeight(downloadableFiles);
      if (gotHeight !== null && gotHeight <= 360) {
        warning = `Only ${gotHeight}p was available — higher quality was blocked (often a temporary YouTube issue). Please try downloading again.`;
      }
    }
  }

  updateJob(jobId, { status: 'completed', progress: 100, files: webFiles, warning });
  try { incrementStats(downloadableFiles.length, totalBytes); } catch { /* non-fatal */ }
}

/** Run a download to completion: spawn yt-dlp, stream progress, finalize. */
export async function run(jobId: string): Promise<void> {
  const job = getJob(jobId);
  clearStopSignals(jobId); // drop any stale pause/cancel signal from a previous run
  const isResume = !!job.has_started;

  const startUpdate: Partial<Job> = { status: 'running', pid: process.pid, worker_pid: process.pid, has_started: true };
  if (isResume) {
    Object.assign(startUpdate, {
      download_speed: null, downloaded_size: null, total_size: null, stream: null, phase: 'resuming',
    });
  } else {
    startUpdate.phase = 'downloading';
  }
  updateJob(jobId, startUpdate);

  const formatFlags = resolveFormat(job.format);

  // Enrich title/thumbnail/filesize in the background instead of blocking the
  // download on a second yt-dlp extraction pass (webpage + player + JS-challenge
  // solving — several seconds on YouTube). The frontend already supplied a
  // thumbnail/title at submit time, so the card isn't blank meanwhile; this just
  // refines it and adds meta_filesize (used for HLS/DASH progress) once it lands.
  if (!isResume) {
    void enrichJobMetadata(jobId, job.url, formatFlags);
  }

  // Bail out if the job was cancelled while queued.
  if (getJob(jobId).status === 'cancelled') return;

  const args = buildArgs(job, formatFlags);

  await new Promise<void>((resolve) => {
    const proc = spawn(YTDLP_BIN, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    updateJob(jobId, { pid: proc.pid ?? null });

    let stderrOutput = '';

    proc.stdout.on('data', (chunk: Buffer) => {
      // NEVER let a parse/write error escape this handler: an uncaught throw here
      // crashes the whole worker process and kills yt-dlp with it. On Windows a
      // job-file write can transiently fail (antivirus, or the server reading the
      // same file mid-rename), so a dropped progress update must be survivable.
      try {
        for (const line of chunk.toString().split('\n')) parseLine(line.trim(), jobId);
      } catch { /* drop this update, keep the download alive */ }
    });
    proc.stderr.on('data', (chunk: Buffer) => { stderrOutput += chunk.toString(); });

    proc.on('close', (exitCode) => {
      try {
        // The worker is the SOLE writer of the job's final status, so there's no
        // cross-process race. A stop signal from the server decides the outcome:
        // pause -> resumable (keep the partial); cancel -> remove the partial.
        // Otherwise the download ended on its own and we finalize it.
        const signal = consumeStopSignal(jobId);
        if (signal === 'pause') {
          updateJob(jobId, { status: 'paused', phase: 'paused' });
        } else if (signal === 'cancel') {
          updateJob(jobId, { status: 'cancelled' });
          try { fs.rmSync(job.output_dir.replace(/[\\/]+$/, ''), { recursive: true, force: true }); } catch { /* ignore */ }
        } else {
          finalizeJob(jobId, job, exitCode, stderrOutput);
        }
      } catch (err) {
        try {
          updateJob(jobId, { status: 'failed', error: err instanceof Error ? err.message : 'Finalize failed' });
        } catch { /* ignore */ }
      }
      resolve();
    });
  });
}
