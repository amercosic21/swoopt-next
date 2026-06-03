// Format/quality options for the download form.

export interface QualityOption {
  value: string;
  label: string;
}

export const VIDEO_QUALITIES: QualityOption[] = [
  { value: 'best',    label: 'Best' },
  { value: '4k',      label: '4K' },
  { value: '1440p',   label: '1440p' },
  { value: '1080p60', label: '1080p 60fps' },
  { value: '1080p',   label: '1080p' },
  { value: '720p',    label: '720p' },
  { value: '480p',    label: '480p' },
  { value: '360p',    label: '360p' },
  { value: '240p',    label: '240p' },
  { value: '144p',    label: '144p' },
];

export const AUDIO_QUALITIES: QualityOption[] = [
  { value: 'best', label: 'Best' },
  { value: '320k', label: '320k' },
  { value: '192k', label: '192k' },
  { value: '128k', label: '128k' },
];

export const ALL_FORMATS = ['mp4', 'webm', 'mp3', 'm4a', 'opus'];
export const AUDIO_FORMATS = ['mp3', 'm4a', 'opus'];

/** Platforms that only have audio — the form restricts to audio formats for these. */
export const AUDIO_ONLY_PLATFORMS = /soundcloud\.com/i;
