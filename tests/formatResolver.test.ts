import { describe, it, expect } from 'vitest';
import { resolveFormat, requestedHeight, parseFormatKey } from '@/lib/FormatResolver';

describe('parseFormatKey', () => {
  it('splits container and quality, defaulting safely', () => {
    expect(parseFormatKey('mp4_720p')).toEqual(['mp4', '720p']);
    expect(parseFormatKey('mp3_320k')).toEqual(['mp3', '320k']);
    expect(parseFormatKey('bogus_x')).toEqual(['mp4', 'x']); // invalid container -> mp4
    expect(parseFormatKey('mp4')).toEqual(['mp4', 'best']);
  });
});

describe('requestedHeight', () => {
  it('returns the pixel height for video qualities', () => {
    expect(requestedHeight('mp4_720p')).toBe(720);
    expect(requestedHeight('mp4_1080p60')).toBe(1080);
    expect(requestedHeight('webm_4k')).toBe(2160);
  });
  it('returns null for best/audio/unknown', () => {
    expect(requestedHeight('mp4_best')).toBeNull();
    expect(requestedHeight('mp3_320k')).toBeNull();
    expect(requestedHeight('m4a_best')).toBeNull();
  });
});

describe('resolveFormat (video)', () => {
  it('prefers h264 + aac for mp4 and does not force an audio re-encode', () => {
    const flags = resolveFormat('mp4_720p');
    const joined = flags.join(' ');
    expect(joined).toContain('--format-sort');
    expect(joined).toContain('vcodec:h264');
    expect(joined).toContain('acodec:aac');
    expect(joined).toContain('bestvideo[height<=720]+bestaudio/best[height<=720]');
    expect(joined).toContain('--merge-output-format mp4');
    // The slow forced re-encode must be gone
    expect(joined).not.toContain('-c:a aac');
  });

  it('prefers vp9 + opus for webm', () => {
    const joined = resolveFormat('webm_1080p').join(' ');
    expect(joined).toContain('vcodec:vp9');
    expect(joined).toContain('acodec:opus');
    expect(joined).toContain('--merge-output-format webm');
  });

  it('uses an uncapped selector for "best"', () => {
    const flags = resolveFormat('mp4_best');
    expect(flags).toContain('bestvideo+bestaudio/best');
  });
});

describe('resolveFormat (audio)', () => {
  it('extracts audio in the requested codec and bitrate', () => {
    const flags = resolveFormat('mp3_320k');
    expect(flags).toContain('--extract-audio');
    expect(flags).toContain('--audio-format');
    expect(flags).toContain('mp3');
    expect(flags).toContain('320K');
  });
  it('uses best quality (0) for audio "best"', () => {
    const flags = resolveFormat('m4a_best');
    expect(flags).toContain('m4a');
    expect(flags).toContain('0');
  });
});
