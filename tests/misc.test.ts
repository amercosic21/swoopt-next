import { describe, it, expect } from 'vitest';
import { isNewer } from '@/lib/ytdlpVersion';
import { formatDuration, formatBytes } from '@/utils/format';
import { completionToast } from '@/utils/jobMessages';
import type { Job } from '@/types';

describe('isNewer (yt-dlp date versions)', () => {
  it('compares date-based versions correctly', () => {
    expect(isNewer('2026.06.01', '2026.03.17')).toBe(true);
    expect(isNewer('2026.03.17', '2026.03.17')).toBe(false);
    expect(isNewer('2026.03.17', '2026.06.01')).toBe(false);
    expect(isNewer('2026.01.01', '2025.12.31')).toBe(true); // year boundary
  });
});

describe('formatDuration', () => {
  it('formats m:ss and h:mm:ss', () => {
    expect(formatDuration(125)).toBe('2:05');
    expect(formatDuration(3725)).toBe('1:02:05');
  });
  it('returns empty string for 0/NaN', () => {
    expect(formatDuration(0)).toBe('');
    expect(formatDuration('abc')).toBe('');
  });
});

describe('formatBytes', () => {
  it('scales to KB/MB/GB', () => {
    expect(formatBytes(512)).toBe('0.5 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
    expect(formatBytes(3 * 1024 * 1024 * 1024)).toBe('3.00 GB');
  });
});

describe('completionToast', () => {
  const base = { warning: null } as Partial<Job> as Job;
  it('plain success when no warning', () => {
    expect(completionToast(base)).toEqual({ key: 'toast.downloadComplete', type: 'success' });
  });
  it('low-quality warning maps to lowQuality info toast', () => {
    expect(completionToast({ ...base, warning: 'Only 360p was available - higher quality blocked' }))
      .toEqual({ key: 'toast.lowQuality', type: 'info' });
  });
  it('other warnings map to doneSkipped info toast', () => {
    expect(completionToast({ ...base, warning: 'Some items were skipped' }))
      .toEqual({ key: 'toast.doneSkipped', type: 'info' });
  });
});
