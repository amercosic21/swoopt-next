import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { YTDLP_BIN } from './config';

export type YtdlpUpdateStatus = 'updated' | 'up_to_date' | 'unknown';

export interface YtdlpUpdateResult {
  status: YtdlpUpdateStatus;
  output: string;
}

const EXEC_OPTS = { encoding: 'utf-8' as const, timeout: 120_000 };

/**
 * Resolve where yt-dlp actually lives. An absolute YTDLP_BIN is trusted as-is;
 * the bare `yt-dlp` name is resolved via the OS (where/which) so we can inspect
 * the real install location (e.g. to detect a scoop-managed binary).
 */
function resolveYtdlpPath(): string {
  if (YTDLP_BIN !== 'yt-dlp' && path.isAbsolute(YTDLP_BIN)) return YTDLP_BIN;
  try {
    const locator = process.platform === 'win32' ? 'where' : 'which';
    const found = execSync(`${locator} yt-dlp`, EXEC_OPTS).split(/\r?\n/)[0].trim();
    return found || YTDLP_BIN;
  } catch {
    return YTDLP_BIN;
  }
}

/** A scoop-managed binary lives somewhere under a `...\scoop\...` path. */
function isScoopInstall(binPath: string): boolean {
  return /[\\/]scoop[\\/]/i.test(binPath);
}

/**
 * Update yt-dlp using the method that matches how it was installed:
 *  - scoop install  -> `scoop update yt-dlp`  (keeps scoop's version tracking in sync)
 *  - pip install    -> `pip install -U yt-dlp` (detected from yt-dlp's own message)
 *  - standalone exe -> `yt-dlp -U`            (native self-update)
 *
 * Throws if the chosen update command fails; callers decide how to surface that
 * (the API route returns a 500, the worker's daily check swallows it).
 */
export function updateYtdlp(): YtdlpUpdateResult {
  const binPath = resolveYtdlpPath();

  // Scoop-managed: update through scoop so a later `scoop update` won't revert it.
  if (isScoopInstall(binPath)) {
    const out = execSync('scoop update yt-dlp 2>&1', EXEC_OPTS).trim();
    const updated  = /updating|was updated|successfully updated/i.test(out);
    const upToDate = /already installed|up to date|latest version/i.test(out);
    return { status: updated ? 'updated' : upToDate ? 'up_to_date' : 'unknown', output: out };
  }

  const out = execSync(`"${YTDLP_BIN}" -U 2>&1`, EXEC_OPTS).trim();

  // pip-managed: yt-dlp refuses to self-update and tells us so; fall back to pip.
  if (out.includes('installed yt-dlp with pip') || out.includes('using the wheel from PyPi')) {
    const pythonDir = path.dirname(path.dirname(binPath));
    let pythonBin = path.join(pythonDir, 'python.exe');
    if (!fs.existsSync(pythonBin)) pythonBin = 'python';
    const pipOut = execSync(`"${pythonBin}" -m pip install -U yt-dlp 2>&1`, EXEC_OPTS).trim();
    const updated  = pipOut.includes('Successfully installed');
    const upToDate = pipOut.includes('already satisfied');
    return { status: updated ? 'updated' : upToDate ? 'up_to_date' : 'unknown', output: pipOut };
  }

  // Standalone binary: native self-update.
  const updated  = out.includes('Updating to') || out.includes('Updated yt-dlp');
  const upToDate = out.includes('up to date') || out.includes('up-to-date');
  return { status: updated ? 'updated' : upToDate ? 'up_to_date' : 'unknown', output: out };
}
