import path from 'path';
import { getJob, updateJob } from './JobManager';
import type { Job } from '@/types';

/** Convert raw bytes to a human-friendly size + unit matching yt-dlp's output (KiB/MiB/GiB). */
function humanSize(bytes: number): { size: number; unit: string } {
  if (bytes >= 1024 * 1024 * 1024) return { size: Math.round(bytes / (1024 * 1024 * 1024) * 100) / 100, unit: 'GiB' };
  if (bytes >= 1024 * 1024)         return { size: Math.round(bytes / (1024 * 1024) * 100) / 100, unit: 'MiB' };
  return { size: Math.round(bytes / 1024 * 100) / 100, unit: 'KiB' };
}

// Per-stream locked total size — prevents HLS/DASH estimated sizes from fluctuating.
// Cleared on Destination line (stream switch) and playlist item switch.
// NOTE: module-level state is safe because each worker process handles one job.
let _lockedTotal: { size: number; unit: string } | null = null;
// Cached metadata filesize (bytes) — avoids re-reading job JSON on every progress line.
let _cachedMetaFilesize: number | null | undefined = undefined;

/** Parse a single line of yt-dlp stdout and update the job's progress/phase. */
export function parseLine(line: string, jobId: string): void {
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
