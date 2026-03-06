import { NextRequest, NextResponse } from 'next/server';
import { getSettings, saveSettings } from '@/lib/Settings';
import type { AppSettings } from '@/types';

export async function GET() {
  try {
    return NextResponse.json(getSettings());
  } catch {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const input = await req.json().catch(() => null);
    if (!input || typeof input !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }

    const safe: Partial<AppSettings> = {};

    if ('subtitles' in input)       safe.subtitles       = Boolean(input.subtitles);
    if ('embed_metadata' in input)  safe.embed_metadata  = Boolean(input.embed_metadata);
    if ('embed_thumbnail' in input) safe.embed_thumbnail = Boolean(input.embed_thumbnail);

    if ('rate_limit' in input) {
      const val = String(input.rate_limit ?? '').trim();
      if (val !== '' && !/^\d+[KkMm]?$/.test(val)) {
        return NextResponse.json({ error: 'Invalid rate limit. Use format like "500K" or "5M".' }, { status: 400 });
      }
      safe.rate_limit = val;
    }

    if ('cookies_browser' in input) {
      const val = String(input.cookies_browser ?? '').toLowerCase().trim();
      const allowed = ['', 'chrome', 'firefox', 'edge', 'opera', 'brave', 'vivaldi', 'safari'];
      if (!allowed.includes(val)) {
        return NextResponse.json({ error: 'Invalid browser for cookies.' }, { status: 400 });
      }
      safe.cookies_browser = val;
    }

    saveSettings(safe);
    return NextResponse.json(getSettings());
  } catch {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
