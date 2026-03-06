import { ALLOWED_URL_PATTERN } from './config';

export function validateUrl(url: string): string {
  url = url.trim();
  if (!url) throw new Error('URL cannot be empty.');

  try {
    new URL(url);
  } catch {
    throw new Error('Invalid URL format.');
  }

  if (!ALLOWED_URL_PATTERN.test(url)) {
    throw new Error(
      'URL platform is not supported. Supported: YouTube, Vimeo, SoundCloud, Twitter/X, Instagram, TikTok, Dailymotion, Twitch.'
    );
  }

  return url;
}

export function validateFormat(format: string): string {
  const validContainers = ['mp4', 'webm', 'mp3', 'm4a', 'opus'];
  const validVideoQ = ['144p', '240p', '360p', '480p', '720p', '1080p', '1080p60', '4k', 'best'];
  const validAudioQ = ['128k', '192k', '320k', 'best'];
  const audioContainers = ['mp3', 'm4a', 'opus'];

  const parts = format.split('_');
  const container = (parts[0] || '').toLowerCase();
  const quality = (parts[1] || '').toLowerCase();

  if (!validContainers.includes(container)) throw new Error('Invalid format container.');

  const validQ = audioContainers.includes(container) ? validAudioQ : validVideoQ;
  if (!validQ.includes(quality)) throw new Error('Invalid quality specified.');

  return format;
}

export function validateType(type: string): string {
  if (!['single', 'playlist'].includes(type)) {
    throw new Error('Type must be "single" or "playlist".');
  }
  return type;
}

export function validateJobId(id: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error('Invalid job ID format.');
  }
  return id;
}
