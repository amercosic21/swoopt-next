import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { YTDLP_BIN } from '@/lib/config';

export async function POST() {
  try {
    const output = execSync(`"${YTDLP_BIN}" -U 2>&1`, { encoding: 'utf-8', timeout: 60000 }).trim();

    const isUpToDate = output.includes('up to date') || output.includes('up-to-date');
    const updated    = output.includes('Updating to') || output.includes('Updated yt-dlp');
    const pipError   = output.includes('installed yt-dlp with pip') || output.includes('using the wheel from PyPi');

    if (pipError) {
      const pythonDir = path.dirname(path.dirname(YTDLP_BIN));
      let pythonBin = path.join(pythonDir, 'python.exe');
      if (!fs.existsSync(pythonBin)) pythonBin = 'python';

      const pipOutput = execSync(`"${pythonBin}" -m pip install -U yt-dlp 2>&1`, {
        encoding: 'utf-8', timeout: 120000,
      }).trim();

      const pipUpdated  = pipOutput.includes('Successfully installed');
      const pipUpToDate = pipOutput.includes('already satisfied');

      return NextResponse.json({
        success: pipUpdated || pipUpToDate,
        output: pipOutput,
        status: pipUpdated ? 'updated' : (pipUpToDate ? 'up_to_date' : 'unknown'),
      });
    }

    return NextResponse.json({
      success: true,
      output,
      status: updated ? 'updated' : (isUpToDate ? 'up_to_date' : 'unknown'),
    });
  } catch {
    return NextResponse.json({ error: 'Failed to update yt-dlp.' }, { status: 500 });
  }
}
