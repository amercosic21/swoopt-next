import fs from 'fs';
import path from 'path';
import { BASE_DIR } from './config';
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
  if (!fs.existsSync(SETTINGS_PATH)) return { ...DEFAULTS };
  try {
    const data = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
    return { ...DEFAULTS, ...data };
  } catch {
    return { ...DEFAULTS };
  }
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

  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(merged, null, 2), 'utf-8');
}

export function getStats(): Stats {
  if (!fs.existsSync(STATS_PATH)) return { total_downloads: 0, total_bytes: 0 };
  try {
    const data = JSON.parse(fs.readFileSync(STATS_PATH, 'utf-8'));
    return data as Stats;
  } catch {
    return { total_downloads: 0, total_bytes: 0 };
  }
}

export function incrementStats(fileCount: number, totalBytes: number): void {
  const stats = getStats();
  stats.total_downloads += fileCount;
  stats.total_bytes += totalBytes;
  fs.writeFileSync(STATS_PATH, JSON.stringify(stats, null, 2), 'utf-8');
}
