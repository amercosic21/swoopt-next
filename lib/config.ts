import path from 'path';

export const BASE_DIR = process.env.BASE_DIR || path.join(process.cwd());
export const DOWNLOADS_DIR = path.join(BASE_DIR, 'downloads');
export const JOBS_DIR = path.join(BASE_DIR, 'jobs');
export const LOGS_DIR = path.join(BASE_DIR, 'logs');

export const YTDLP_BIN = process.env.YTDLP_BIN || 'yt-dlp';
export const FFMPEG_BIN = process.env.FFMPEG_BIN || 'ffmpeg';
export const NODE_BIN = process.env.NODE_BIN || 'node';

export const MAX_CONCURRENT_JOBS = parseInt(process.env.MAX_CONCURRENT_JOBS || '3', 10);
export const JOB_TTL = parseInt(process.env.JOB_TTL || '86400', 10);

export const ALLOWED_URL_PATTERN =
  /^https?:\/\/(www\.)?(youtube\.com|youtu\.be|vimeo\.com|soundcloud\.com|twitter\.com|x\.com|instagram\.com|tiktok\.com|dailymotion\.com|twitch\.tv)/i;
