import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { DOWNLOADS_DIR, JOBS_DIR, JOB_TTL } from './config';
import { readJson, writeJsonAtomic } from './jsonFile';
import type { Job, JobStatus } from '@/types';

function jobPath(jobId: string): string {
  return path.join(JOBS_DIR, `${jobId}.json`);
}

const readJobFile = (filePath: string): Job | null => readJson<Job>(filePath);
const writeJobFile = (filePath: string, job: Job): void => writeJsonAtomic(filePath, job);

// ── Stop signals (pause/cancel) ──────────────────────────────────────────────
// A running download is interrupted by dropping a small sentinel file next to the
// job JSON, then killing yt-dlp. The worker consumes the signal in its close handler
// and is the SOLE writer of the resulting status. Because the signal lives in its own
// file (never in the job JSON), a progress write can't clobber it — so no lock and no
// status-preservation gymnastics are needed. Signal files don't end in `.json`, so
// loadAllJobs/purgeExpired ignore them.
export type StopSignal = 'pause' | 'cancel';

function signalPath(jobId: string, kind: StopSignal): string {
  return path.join(JOBS_DIR, `${jobId}.${kind}`);
}

/** Ask a running job's worker to stop; it applies the status on its next close. */
export function requestStop(jobId: string, kind: StopSignal): void {
  try { fs.writeFileSync(signalPath(jobId, kind), ''); } catch { /* ignore */ }
}

/** Consume a pending stop signal, returning which kind was set (or null). */
export function consumeStopSignal(jobId: string): StopSignal | null {
  for (const kind of ['pause', 'cancel'] as const) {
    const p = signalPath(jobId, kind);
    if (fs.existsSync(p)) {
      try { fs.unlinkSync(p); } catch { /* ignore */ }
      return kind;
    }
  }
  return null;
}

/** Remove any pending stop signals for a job. */
export function clearStopSignals(jobId: string): void {
  for (const kind of ['pause', 'cancel'] as const) {
    try { fs.unlinkSync(signalPath(jobId, kind)); } catch { /* ignore */ }
  }
}

export function createJob(url: string, format: string, type: string): Job {
  const id = randomUUID();
  const outputDir = path.join(DOWNLOADS_DIR, id, '/');

  fs.mkdirSync(JOBS_DIR, { recursive: true });
  fs.mkdirSync(outputDir, { recursive: true });

  const job: Job = {
    id,
    url,
    format,
    type: type as Job['type'],
    status: 'queued',
    progress: 0,
    current_item: 0,
    total_items: 0,
    current_title: '',
    output_dir: outputDir,
    files: [],
    error: null,
    pid: null,
    created_at: Math.floor(Date.now() / 1000),
    updated_at: Math.floor(Date.now() / 1000),
  };

  writeJobFile(jobPath(id), job);
  return job;
}

export function getJob(jobId: string): Job {
  const p = jobPath(jobId);
  if (!fs.existsSync(p)) {
    throw new Error(`Job not found: ${jobId}`);
  }
  const job = readJobFile(p);
  if (!job) {
    throw new Error(`Corrupt job file: ${jobId}`);
  }
  return job;
}

export function updateJob(jobId: string, changes: Partial<Job>): void {
  const p = jobPath(jobId);
  if (!fs.existsSync(p)) return;

  const job = readJobFile(p);
  if (!job) return;

  writeJobFile(p, {
    ...job,
    ...changes,
    updated_at: Math.floor(Date.now() / 1000),
  });
}

/** Read and parse every job file (skipping unreadable ones). */
function loadAllJobs(): Job[] {
  if (!fs.existsSync(JOBS_DIR)) return [];
  const jobs: Job[] = [];
  for (const file of fs.readdirSync(JOBS_DIR)) {
    if (!file.endsWith('.json')) continue;
    const job = readJobFile(path.join(JOBS_DIR, file));
    if (job) jobs.push(job);
  }
  return jobs;
}

// History = finished jobs only. Active states (running/queued/paused) live in the
// Active Downloads section, so excluding them here stops a paused job from also
// appearing (rendered as "Cancelled") in History.
const TERMINAL_STATUSES: JobStatus[] = ['completed', 'failed', 'cancelled'];

export function getAllJobs(limit = 50, offset = 0): Job[] {
  return loadAllJobs()
    .filter(j => TERMINAL_STATUSES.includes(j.status))
    .sort((a, b) => b.created_at - a.created_at)
    .slice(offset, offset + limit);
}

export function countByStatus(status: JobStatus): number {
  return loadAllJobs().filter(j => j.status === status).length;
}

export function getByStatus(status: JobStatus, limit = 10): Job[] {
  return loadAllJobs()
    .filter(j => j.status === status)
    .sort((a, b) => a.created_at - b.created_at)
    .slice(0, limit);
}

export function deleteJob(jobId: string): void {
  const p = jobPath(jobId);
  if (fs.existsSync(p)) {
    fs.unlinkSync(p);
  }
  clearStopSignals(jobId);
}

export function purgeExpired(): void {
  if (!fs.existsSync(JOBS_DIR)) return;

  const files = fs.readdirSync(JOBS_DIR).filter(f => f.endsWith('.json'));
  const cutoff = Math.floor(Date.now() / 1000) - JOB_TTL;
  const terminalStatuses: JobStatus[] = ['completed', 'failed', 'cancelled'];

  for (const file of files) {
    const p = path.join(JOBS_DIR, file);
    const job = readJobFile(p);
    if (!job) {
      fs.unlinkSync(p);
      continue;
    }
    if (terminalStatuses.includes(job.status) && job.updated_at < cutoff) {
      fs.unlinkSync(p);
    }
  }
}

/**
 * Detect an interrupted running job and mark it PAUSED so the UI shows a "paused +
 * resume" card instead of a stuck progress bar. The partial file stays on disk and
 * yt-dlp resumes with -c, so the user continues from where it stopped (e.g. after
 * killing/restarting the server) instead of starting over. Returns the job.
 *
 * We check the WORKER process, not job.pid (the yt-dlp child): the worker stays alive
 * through the whole download AND the finalize/merge step, whereas yt-dlp's PID goes
 * dead briefly during finalize. So a dead worker unambiguously means a real
 * interruption and we pause immediately (older jobs without a recorded worker_pid
 * fall back to job.pid). A live worker is never paused — yt-dlp is legitimately quiet
 * during extraction, JS-challenge solving, and merging.
 */
export function reconcileStaleJob(job: Job): Job {
  if (job.status !== 'running') return job;

  const checkPid = job.worker_pid ?? job.pid;
  let workerAlive = false;
  if (checkPid) {
    try { process.kill(checkPid, 0); workerAlive = true; } // signal 0 = existence check
    catch { /* ESRCH: the process is gone */ }
  }

  if (!workerAlive) {
    updateJob(job.id, { status: 'paused', phase: 'paused' });
    return getJob(job.id);
  }
  return job;
}
