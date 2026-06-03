import path from 'path';
import { BASE_DIR } from './config';
import { readJson, writeJsonAtomic } from './jsonFile';
import type { AppSettings, Stats } from '@/types';

const SETTINGS_PATH = path.join(BASE_DIR, 'settings.json');
const STATS_PATH = path.join(BASE_DIR, 'stats.json');

const DEFAULTS: AppSettings = {
  download_dir: '',
  subtitles: false,
  embed_metadata: false,
  embed_thumbnail: false,
  rate_limit: '',
  cookies_browser: '',
};

export function getSettings(): AppSettings {
  return { ...DEFAULTS, ...(readJson<Partial<AppSettings>>(SETTINGS_PATH) ?? {}) };
}

export function saveSettings(settings: Partial<AppSettings>): void {
  const current = getSettings();
  const allowed = Object.keys(DEFAULTS) as (keyof AppSettings)[];
  const merged = { ...current } as Record<string, unknown>;

  for (const key of allowed) {
    if (key in settings) {
      merged[key] = settings[key];
    }
  }

  writeJsonAtomic(SETTINGS_PATH, merged);
}

export function getStats(): Stats {
  return readJson<Stats>(STATS_PATH) ?? { total_downloads: 0, total_bytes: 0 };
}

export function incrementStats(fileCount: number, totalBytes: number): void {
  const stats = getStats();
  stats.total_downloads += fileCount;
  stats.total_bytes += totalBytes;
  writeJsonAtomic(STATS_PATH, stats);
}
