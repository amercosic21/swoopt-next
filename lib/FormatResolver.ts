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

function videoFlags(ext: string, quality: string): string[] {
  const mergeExt = ext === 'webm' ? 'webm' : 'mp4';

  const formatMap: Record<string, string> = {
    '144p':    'bestvideo[height<=144]+bestaudio/best[height<=144]',
    '240p':    'bestvideo[height<=240]+bestaudio/best[height<=240]',
    '360p':    'bestvideo[height<=360]+bestaudio/best[height<=360]',
    '480p':    `bestvideo[height<=480][ext=${ext}]+bestaudio[ext=m4a]/bestvideo[height<=480]+bestaudio/best[height<=480]`,
    '720p':    `bestvideo[height<=720][ext=${ext}]+bestaudio[ext=m4a]/bestvideo[height<=720]+bestaudio/best[height<=720]`,
    '1080p':   `bestvideo[height<=1080][ext=${ext}]+bestaudio[ext=m4a]/bestvideo[height<=1080]+bestaudio/best[height<=1080]`,
    '1080p60': 'bestvideo[height<=1080][fps<=60]+bestaudio[ext=m4a]/bestvideo[height<=1080][fps<=60]+bestaudio/best[height<=1080]',
    '4k':      `bestvideo[height<=2160][ext=${ext}]+bestaudio[ext=m4a]/bestvideo[height<=2160]+bestaudio/best[height<=2160]`,
  };

  const formatStr = formatMap[quality] ?? 'bestvideo+bestaudio/best';

  const flags = ['--format', formatStr, '--merge-output-format', mergeExt];

  if (mergeExt === 'mp4') {
    flags.push('--postprocessor-args', 'Merger+ffmpeg:-c:a aac -b:a 192k');
  }

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
