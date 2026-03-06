/**
 * Swoopt Worker — Node.js CLI script
 * Spawned by Downloader.dispatch() — never called directly via HTTP.
 * Usage: tsx worker/worker.ts <job_id>
 */

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { execSync } from 'child_process';
import { config as loadDotenv } from 'dotenv';

// Resolve BASE_DIR from this file's location (worker/ → project root)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.BASE_DIR = path.resolve(__dirname, '..');

// Load env from .env.local BEFORE importing lib modules (they read process.env at load time)
loadDotenv({ path: path.join(process.env.BASE_DIR, '.env.local') });

const jobId = process.argv[2];

if (!jobId) {
  process.stderr.write('Usage: node worker.ts <job_id>\n');
  process.exit(1);
}

// Dynamic imports — must happen AFTER dotenv so config.ts reads the correct env vars
(async () => {
  const { validateJobId } = await import('../lib/Sanitizer');
  const { getJob, updateJob, getByStatus } = await import('../lib/JobManager');
  const { run, dispatch } = await import('../lib/Downloader');
  const { YTDLP_BIN, LOGS_DIR } = await import('../lib/config');

  // Auto-update yt-dlp once per day
  try {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
    const stampFile = path.join(LOGS_DIR, '.ytdlp_last_update');
    const lastCheck = fs.existsSync(stampFile)
      ? parseInt(fs.readFileSync(stampFile, 'utf-8'), 10)
      : 0;

    if (Math.floor(Date.now() / 1000) - lastCheck > 86400) {
      try {
        const out = execSync(`"${YTDLP_BIN}" -U 2>&1`, { encoding: 'utf-8', timeout: 60000 });
        if (out.includes('installed yt-dlp with pip') || out.includes('using the wheel from PyPi')) {
          const pythonDir = path.dirname(path.dirname(YTDLP_BIN));
          let pythonBin = path.join(pythonDir, 'python.exe');
          if (!fs.existsSync(pythonBin)) pythonBin = 'python';
          execSync(`"${pythonBin}" -m pip install -U yt-dlp 2>&1`, { timeout: 120000 });
        }
      } catch { /* non-fatal */ }
      fs.writeFileSync(stampFile, String(Math.floor(Date.now() / 1000)));
    }
  } catch { /* non-fatal */ }

  // Run the download
  try {
    validateJobId(jobId);
    await run(jobId);
  } catch (err) {
    try {
      updateJob(jobId, {
        status: 'failed',
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    } catch { /* job file may not exist */ }
    process.stderr.write(`Worker error: ${err}\n`);
  }

  // After job finishes, dispatch next queued job
  try {
    const queued = getByStatus('queued', 1);
    if (queued.length > 0) {
      dispatch(queued[0].id);
    }
  } catch { /* non-fatal */ }
})();
