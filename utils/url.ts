// URL classification + normalization for the download form (pure helpers).

export type UrlType = 'single' | 'playlist' | 'video-in-playlist';

const PLAYLIST_URL_PATTERNS = [
  /[?&]list=[^&]+/,
  /youtube\.com\/playlist\?/,
  /youtube\.com\/@[^/]+\/playlists/,
  /soundcloud\.com\/[^/]+\/sets\//,
  /spotify\.com\/playlist\//,
  /tiktok\.com\/@[^/]+\/playlist\//,
  /vimeo\.com\/showcase\//,
  /vimeo\.com\/channels\//,
  /twitch\.tv\/[^/]+\/collections\//,
];

const SINGLE_VIDEO_PATTERNS = [
  /youtube\.com\/watch\?v=[^&]+(?!.*[?&]list=)/,
  /youtu\.be\/[a-zA-Z0-9_-]+/,
  /vimeo\.com\/\d+/,
  /tiktok\.com\/@[^/]+\/video\//,
  /twitter\.com\/[^/]+\/status\//,
  /x\.com\/[^/]+\/status\//,
  /instagram\.com\/p\//,
  /instagram\.com\/reel\//,
  /dailymotion\.com\/video\//,
  /soundcloud\.com\/[^/]+\/(?!sets\/)[^/]+/,
  /twitch\.tv\/videos\/\d+/,
  /twitch\.tv\/[^/]+\/clip\//,
];

/** Removes playlist-related query params so only the single video is downloaded. */
export function stripPlaylistParams(url: string): string {
  try {
    const u = new URL(url);
    u.searchParams.delete('list');
    u.searchParams.delete('index');
    u.searchParams.delete('start_radio');
    u.searchParams.delete('playnext');
    return u.toString();
  } catch {
    return url;
  }
}

/** Prepends https:// when the user omitted the protocol. */
export function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : 'https://' + trimmed;
}

/** Classifies a pasted URL as a single video, a playlist, or a video inside a playlist. */
export function detectUrlType(url: string): UrlType | null {
  if (!url) return null;

  // A specific video is referenced either via the ?v= query param
  // (youtube.com/watch) or via the youtu.be/<id> short-link path (what the
  // "Share" button produces). If a list= is also present, it's a single video
  // *inside* a playlist — let the user choose single (default) or the playlist.
  const hasVideo = /[?&]v=[a-zA-Z0-9_-]+/.test(url) || /youtu\.be\/[a-zA-Z0-9_-]+/.test(url);
  const hasList = /[?&]list=[^&]+/.test(url);
  if (hasVideo && hasList) return 'video-in-playlist';

  if (PLAYLIST_URL_PATTERNS.some(p => p.test(url))) return 'playlist';
  if (SINGLE_VIDEO_PATTERNS.some(p => p.test(url))) return 'single';
  return null;
}
