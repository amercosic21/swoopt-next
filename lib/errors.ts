import { getTranslation } from '@/hooks/useI18n';

const ERROR_RULES: [RegExp, string][] = [
  [/video unavailable|this video is not available|has been removed/i, 'error.unavailable'],
  [/private video|sign in to confirm your age|age.restricted/i, 'error.private'],
  [/copyright|removed by the uploader/i, 'error.copyright'],
  [/no such format|requested format.*not available|format.*unavailable/i, 'error.formatUnavailable'],
  [/playlist.*not found|playlist does not exist/i, 'error.playlistNotFound'],
  [/this live event will begin|is not yet available|premiere/i, 'error.premiere'],
  [/live stream|this is a live stream/i, 'error.liveStream'],
  [/unable to extract|could not find|extraction failed/i, 'error.extraction'],
  [/HTTP Error 403|forbidden/i, 'error.forbidden'],
  [/HTTP Error 404|not found/i, 'error.notFound'],
  [/HTTP Error 429|too many requests/i, 'error.tooManyRequests'],
  [/network|connection|timed? ?out|no route to host/i, 'error.network'],
  [/ffmpeg|merger|mux/i, 'error.ffmpeg'],
  [/no video formats found|no formats found/i, 'error.noFormats'],
  [/login required|sign in/i, 'error.loginRequired'],
  [/members.only|channel membership/i, 'error.membersOnly'],
];

export function friendlyError(raw: string | null | undefined): string {
  const t = getTranslation;
  if (!raw) return t('error.unknown');
  const s = String(raw);

  for (const [pattern, key] of ERROR_RULES) {
    if (pattern.test(s)) return t(key);
  }

  // Clean up raw yt-dlp output
  const cleaned = s
    .replace(/ERROR:\s*/gi, '')
    .replace(/\[[\w:]+\]\s*/g, '')
    .replace(/Traceback[\s\S]*/i, '')
    .replace(/yt-dlp exited with code \d+\.?/i, '')
    .replace(/^\s+|\s+$/g, '')
    .replace(/\s{2,}/g, ' ');

  if (cleaned.length > 0) {
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1, 160) + (cleaned.length > 160 ? '\u2026' : '');
  }

  return t('error.genericFailed');
}
