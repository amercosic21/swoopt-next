import { describe, it, expect } from 'vitest';
import { detectUrlType, stripPlaylistParams, normalizeUrl } from '@/utils/url';

describe('detectUrlType', () => {
  it('classifies a plain single video', () => {
    expect(detectUrlType('https://www.youtube.com/watch?v=5KbSZroV2lo')).toBe('single');
    expect(detectUrlType('https://youtu.be/5KbSZroV2lo?si=xx')).toBe('single');
  });

  it('classifies a pure playlist', () => {
    expect(detectUrlType('https://www.youtube.com/playlist?list=PLabc123')).toBe('playlist');
  });

  it('treats a video inside a playlist as video-in-playlist (both forms)', () => {
    // watch?v= + list
    expect(detectUrlType('https://www.youtube.com/watch?v=5KbSZroV2lo&list=PLabc')).toBe('video-in-playlist');
    // youtu.be short link + list (the Share-button case that used to be misread)
    expect(detectUrlType('https://youtu.be/5KbSZroV2lo?si=xx&list=PLabc&index=3')).toBe('video-in-playlist');
    // Mix/Radio list
    expect(detectUrlType('https://youtu.be/5KbSZroV2lo?list=RD5KbSZroV2lo')).toBe('video-in-playlist');
  });

  it('returns null for unrecognized input', () => {
    expect(detectUrlType('')).toBeNull();
    expect(detectUrlType('https://example.com/whatever')).toBeNull();
  });
});

describe('stripPlaylistParams', () => {
  it('removes list/index/radio params, keeps the video id', () => {
    const out = stripPlaylistParams('https://www.youtube.com/watch?v=abc&list=PL1&index=4&start_radio=1');
    expect(out).toContain('v=abc');
    expect(out).not.toContain('list=');
    expect(out).not.toContain('index=');
    expect(out).not.toContain('start_radio=');
  });

  it('returns the input unchanged when it is not a valid URL', () => {
    expect(stripPlaylistParams('not a url')).toBe('not a url');
  });
});

describe('normalizeUrl', () => {
  it('prepends https:// when the protocol is missing', () => {
    expect(normalizeUrl('youtube.com/watch?v=x')).toBe('https://youtube.com/watch?v=x');
  });
  it('leaves an existing protocol intact and trims', () => {
    expect(normalizeUrl('  https://youtu.be/x  ')).toBe('https://youtu.be/x');
    expect(normalizeUrl('http://youtu.be/x')).toBe('http://youtu.be/x');
  });
  it('returns empty string for blank input', () => {
    expect(normalizeUrl('   ')).toBe('');
  });
});
