// Pure display formatters shared across UI components.

/** Format a duration in seconds as `m:ss` or `h:mm:ss`. Empty string for 0/NaN. */
export function formatDuration(secs: number | string): string {
  const n = typeof secs === 'string' ? parseInt(secs, 10) : secs;
  if (!n || isNaN(n)) return '';
  const h = Math.floor(n / 3600);
  const m = Math.floor((n % 3600) / 60);
  const s = n % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
}

/** Format a byte count as KB / MB / GB for display. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
}
