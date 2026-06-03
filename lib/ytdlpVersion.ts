// yt-dlp version check (server-only, used by the check-update / update routes).
import { execSync } from 'child_process';
import { YTDLP_BIN } from './config';

export interface UpdateInfo {
  current: string;
  latest: string;
  updateAvailable: boolean;
}

// Cache the result so we don't query GitHub on every page load.
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours
let cache: { at: number; data: UpdateInfo } | null = null;

/** True if version `a` is newer than `b` (yt-dlp uses date-based YYYY.MM.DD). */
export function isNewer(a: string, b: string): boolean {
  const pa = a.split('.').map(n => parseInt(n, 10) || 0);
  const pb = b.split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x > y;
  }
  return false;
}

/** Returns the installed vs latest yt-dlp version (cached). Never throws. */
export async function getUpdateInfo(): Promise<UpdateInfo> {
  if (cache && Date.now() - cache.at < CACHE_TTL) return cache.data;

  try {
    const current = execSync(`"${YTDLP_BIN}" --version`, { encoding: 'utf-8', timeout: 15000 }).trim();

    // Latest stable release tag from GitHub (read-only; installs nothing).
    let latest = current;
    const res = await fetch('https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest', {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'swoopt' },
    });
    if (res.ok) {
      const json = await res.json();
      latest = String(json.tag_name || '').trim() || current;
    }

    const data: UpdateInfo = { current, latest, updateAvailable: isNewer(latest, current) };
    cache = { at: Date.now(), data };
    return data;
  } catch {
    return { current: '', latest: '', updateAvailable: false };
  }
}

/** Invalidate the cached version info — call after an in-app update. */
export function clearVersionCache(): void {
  cache = null;
}
