import fs from 'fs';

// Small helpers for persisting JSON to disk.
//
// Concurrency model: job/stats files are written by both the Next server (API
// routes) and the per-job worker processes. Writes use a temp-file + atomic
// rename so a reader always sees a complete file, never a half-written one
// (which previously could surface as a "corrupt job file" error). This does not
// serialize concurrent read-modify-write from two processes, but those windows
// are tiny and the affected flows (cancel/pause) re-check status defensively, so
// a full cross-process lock isn't warranted here.

/** Parse a JSON file, or return null if missing/unreadable/corrupt. */
export function readJson<T>(filePath: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
  } catch {
    return null;
  }
}

// Reused buffer for sleepSync — Atomics.wait blocks the thread without busy-looping.
const SLEEP_BUF = new Int32Array(new SharedArrayBuffer(4));
/** Briefly block the current thread (used to back off between rename retries). */
function sleepSync(ms: number): void {
  try { Atomics.wait(SLEEP_BUF, 0, 0, ms); } catch { /* ignore */ }
}

/** Write JSON via a temp file + atomic rename so readers never see a partial write. */
export function writeJsonAtomic(filePath: string, data: unknown): void {
  const tmp = `${filePath}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');

  // The rename can transiently fail on Windows with EPERM/EBUSY/EACCES when another
  // process has the destination briefly open (the server reading the job file during
  // a progress poll, or antivirus scanning it). These locks clear within a few ms,
  // so retry with a short backoff before giving up. The worker's stdout handler also
  // guards against a final failure, so a dropped write never kills the download.
  let lastErr: unknown;
  for (let attempt = 0; attempt < 8; attempt++) {
    try { fs.renameSync(tmp, filePath); return; }
    catch (err) {
      lastErr = err;
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== 'EPERM' && code !== 'EBUSY' && code !== 'EACCES') break;
      sleepSync(15);
    }
  }
  try { fs.unlinkSync(tmp); } catch { /* ignore */ }
  throw lastErr;
}
