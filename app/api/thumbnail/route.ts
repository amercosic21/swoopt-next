import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { validateUrl } from '@/lib/Sanitizer';
import { YTDLP_BIN, FFMPEG_BIN, NODE_BIN } from '@/lib/config';

export async function GET(req: NextRequest) {
  try {
    const url = validateUrl(req.nextUrl.searchParams.get('url') ?? '');

    const args: string[] = [];
    if (FFMPEG_BIN) args.push('--ffmpeg-location', FFMPEG_BIN);
    if (process.platform === 'win32' && NODE_BIN) args.push('--js-runtimes', `node:${NODE_BIN}`);
    args.push('--dump-json', '--skip-download', '--no-warnings', '--playlist-items', '1', url);

    const result = await new Promise<string>((resolve, reject) => {
      const proc = spawn(YTDLP_BIN, args, { stdio: ['ignore', 'pipe', 'ignore'] });
      let output = '';
      proc.stdout.on('data', (chunk: Buffer) => { output += chunk.toString(); });
      proc.on('close', () => resolve(output));
      proc.on('error', reject);
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
    if (err instanceof Error && err.message.includes('not supported')) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof Error) return NextResponse.json({ error: err.message }, { status: 400 });
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
