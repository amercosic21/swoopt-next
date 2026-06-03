// Shared helpers for API route handlers (server-only — imported by app/api/**,
// never by the worker or client). Centralizes the repeated body parsing, error
// mapping, and filesystem/process cleanup logic.
import { NextResponse, type NextRequest } from 'next/server';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { validateJobId } from './Sanitizer';
import type { Job } from '@/types';

/**
 * Best-effort gate for privileged endpoints (updating the yt-dlp binary): allow
 * only requests whose Host is loopback. A browser sets Host to the address it
 * actually connected to, so a LAN/remote visitor hitting http://<server-ip>:3000
 * is rejected, while normal localhost use passes.
 *
 * This is defense in depth, not a hard boundary: every HTTP header (Host,
 * X-Forwarded-For) is client-spoofable, so a determined attacker against an
 * exposed instance could forge it. The real protection if you ever expose this
 * is to bind the server to loopback (next start -H 127.0.0.1) or put auth in front.
 */
export function isLocalRequest(req: NextRequest): boolean {
  const host = (req.headers.get('host') || '').split(':')[0].toLowerCase().replace(/^\[|\]$/g, '');
  return host === 'localhost' || host === '127.0.0.1' || host === '::1';
}

/** Maps a thrown error to the standard JSON response: 404 (not found) / 400 (other Error) / 500. */
export function apiError(err: unknown): NextResponse {
  if (err instanceof Error && err.message.includes('not found')) {
    return NextResponse.json({ error: 'Job not found.' }, { status: 404 });
  }
  if (err instanceof Error) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  return NextResponse.json({ error: 'A server error occurred.' }, { status: 500 });
}

/** Parses the request JSON body and returns a validated job_id (throws if invalid). */
export async function readJobIdBody(req: NextRequest): Promise<string> {
  const input = await req.json().catch(() => ({}));
  return validateJobId(input?.job_id ?? '');
}

/** Deletes a job's output directory and everything in it. No-op if absent. */
export function removeOutputDir(job: Job): void {
  const dir = job.output_dir?.replace(/[\\/]+$/, '');
  if (!dir || !fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir)) {
    try { fs.unlinkSync(path.join(dir, entry)); } catch { /* ignore */ }
  }
  try { fs.rmdirSync(dir); } catch { /* ignore */ }
}

/** Force-kills a worker process (and its children) cross-platform. No-op if no pid. */
export function killProcess(pid: number | null | undefined): void {
  if (!pid) return;
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /F /T /PID ${pid}`, { stdio: 'ignore' });
    } else {
      process.kill(-pid, 'SIGKILL');
    }
  } catch { /* already dead */ }
}
