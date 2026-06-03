export function resolveFormat(formatKey: string): string[] {
  const [container, quality] = parseFormatKey(formatKey);

  switch (container) {
    case 'mp3':  return audioFlags('mp3', quality);
    case 'm4a':  return audioFlags('m4a', quality);
    case 'opus': return audioFlags('opus', quality);
    case 'webm': return videoFlags('webm', quality);
    default:     return videoFlags('mp4', quality);
  }
}

export function parseFormatKey(key: string): [string, string] {
  const parts = key.split('_');
  const validContainers = ['mp4', 'webm', 'mp3', 'm4a', 'opus'];
  let container = (parts[0] || 'mp4').toLowerCase();
  const quality = (parts[1] || 'best').toLowerCase();

  if (!validContainers.includes(container)) container = 'mp4';
  return [container, quality];
}

// Maps a quality key to its maximum video height in pixels. 'best' and any
// unknown key return null (no height cap → take the highest available).
const QUALITY_HEIGHT: Record<string, number> = {
  '144p': 144,
  '240p': 240,
  '360p': 360,
  '480p': 480,
  '720p': 720,
  '1080p': 1080,
  '1080p60': 1080,
  '4k': 2160,
};

/** Maximum requested video height for a format key, or null for "best"/audio/unknown. */
export function requestedHeight(formatKey: string): number | null {
  const [container, quality] = parseFormatKey(formatKey);
  if (['mp3', 'm4a', 'opus'].includes(container)) return null;
  return QUALITY_HEIGHT[quality] ?? null;
}

function videoFlags(ext: string, quality: string): string[] {
  const mergeExt = ext === 'webm' ? 'webm' : 'mp4';
  const height = QUALITY_HEIGHT[quality] ?? null;
  const fpsCap = quality === '1080p60' ? '[fps<=60]' : '';

  // Loose -f: take the best separate video+audio under the height cap, falling
  // back to the best progressive stream only as a last resort. We deliberately
  // do NOT constrain codecs/ext here — that hard-fails when the preferred codec
  // is unavailable and causes a silent drop to the 360p progressive format.
  // Codec/container preference is expressed via --format-sort below, which only
  // *sorts* the available formats and therefore never fails to find a match.
  const heightFilter = height ? `[height<=${height}]${fpsCap}` : '';
  const formatStr = height
    ? `bestvideo${heightFilter}+bestaudio/best${heightFilter}`
    : 'bestvideo+bestaudio/best';

  // Prefer H.264 (avc1) video + AAC audio for mp4 so files play everywhere and
  // match the quality users expect; prefer VP9 + Opus for webm. `res`/`fps`
  // stay first so resolution is never sacrificed for codec preference.
  const sort = mergeExt === 'mp4'
    ? 'res,fps,vcodec:h264,acodec:aac,br'
    : 'res,fps,vcodec:vp9,acodec:opus,br';

  // No forced audio re-encode: --format-sort already prefers AAC (for mp4) /
  // Opus (for webm), so the merge is a near-instant stream copy. Re-encoding
  // every download to AAC wasted seconds (and slightly degraded audio) for no
  // gain. yt-dlp still transparently re-encodes only when a codec genuinely
  // can't be muxed into the chosen container.
  const flags = [
    '--format', formatStr,
    '--format-sort', sort,
    '--merge-output-format', mergeExt,
  ];

  return flags;
}

function audioFlags(codec: string, quality: string): string[] {
  const flags = ['--extract-audio', '--audio-format', codec];

  const bitrateMap: Record<string, string> = {
    '128k': '128K',
    '192k': '192K',
    '320k': '320K',
  };
  const bitrate = bitrateMap[quality] ?? '0';

  flags.push('--audio-quality', bitrate);
  return flags;
}
