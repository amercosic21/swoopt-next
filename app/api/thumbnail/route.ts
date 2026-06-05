import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { validateUrl } from '@/lib/Sanitizer';
import { YTDLP_BIN, FFMPEG_BIN, NODE_BIN } from '@/lib/config';
import { apiError } from '@/lib/apiHelpers';

export async function GET(req: NextRequest) {
  try {
    const url = validateUrl(req.nextUrl.searchParams.get('url') ?? '');

    const args: string[] = [];
    if (FFMPEG_BIN && FFMPEG_BIN !== 'ffmpeg') args.push('--ffmpeg-location', FFMPEG_BIN);
    if (process.platform === 'win32' && NODE_BIN) args.push('--js-runtimes', `node:${NODE_BIN}`);
    args.push('--dump-json', '--skip-download', '--no-warnings', '--playlist-items', '1', url);

    const result = await new Promise<string>((resolve, reject) => {
      const proc = spawn(YTDLP_BIN, args, { stdio: ['ignore', 'pipe', 'ignore'] });
      let output = '';
      // Kill a hung yt-dlp after 20s; an empty result becomes a graceful 422 below.
      const killTimer = setTimeout(() => { try { proc.kill(); } catch { /* already gone */ } }, 20_000);
      proc.stdout.on('data', (chunk: Buffer) => { output += chunk.toString(); });
      proc.on('close', () => { clearTimeout(killTimer); resolve(output); });
      proc.on('error', (err) => { clearTimeout(killTimer); reject(err); });
    });

    const json = JSON.parse(result.trim());
    if (!json || typeof json !== 'object') {
      return NextResponse.json({ error: 'Could not fetch metadata.' }, { status: 422 });
    }

    const title    = String(json.title || '').trim();
    const thumbnail = String(json.thumbnail || '').trim();
    const duration  = parseInt(json.duration || '0', 10);
    const channel   = String(json.channel || json.uploader || '').trim();
    const vcodec    = String(json.vcodec || 'none').trim();
    const hasVideo  = vcodec !== 'none' && vcodec !== '';

    if (!title && !thumbnail) {
      return NextResponse.json({ error: 'Could not fetch metadata.' }, { status: 422 });
    }

    return NextResponse.json({ title, thumbnail, duration, channel, has_video: hasVideo });
  } catch (err) {
    return apiError(err);
  }
}
