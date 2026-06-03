import { execFileSync } from 'child_process';
import path from 'path';
import { FFMPEG_BIN } from './config';

/** Path to ffprobe, derived from the configured ffmpeg binary. */
function ffprobeBin(): string {
  if (!FFMPEG_BIN || FFMPEG_BIN === 'ffmpeg') return 'ffprobe';
  const dir = path.dirname(FFMPEG_BIN);
  const name = path.basename(FFMPEG_BIN).replace(/ffmpeg/i, 'ffprobe');
  return path.join(dir, name);
}

/**
 * Returns the largest video height (px) among the given files, or null if none
 * could be probed (e.g. audio-only, ffprobe missing). Used to detect a silent
 * fallback to a low-resolution stream after the download completes.
 */
export function probeMaxHeight(files: string[]): number | null {
  const probe = ffprobeBin();
  let maxHeight: number | null = null;
  for (const file of files) {
    try {
      const out = execFileSync(
        probe,
        ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=height', '-of', 'csv=p=0', file],
        { encoding: 'utf-8', timeout: 15000 },
      ).trim();
      const h = parseInt(out, 10);
      if (!isNaN(h) && h > 0 && (maxHeight === null || h > maxHeight)) maxHeight = h;
    } catch { /* not a video / ffprobe unavailable — skip */ }
  }
  return maxHeight;
}
