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

/** Write JSON via a temp file + atomic rename so readers never see a partial write. */
export function writeJsonAtomic(filePath: string, data: unknown): void {
  const tmp = `${filePath}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
  try {
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmp, filePath);
  } catch (err) {
    try { fs.unlinkSync(tmp); } catch { /* ignore */ }
    throw err;
  }
}
