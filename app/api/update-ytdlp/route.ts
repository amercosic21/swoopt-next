import { NextRequest, NextResponse } from 'next/server';
import { updateYtdlp } from '@/lib/ytdlpUpdate';
import { clearVersionCache } from '@/lib/ytdlpVersion';
import { isLocalRequest } from '@/lib/apiHelpers';

export async function POST(req: NextRequest) {
  if (!isLocalRequest(req)) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  try {
    const { status, output } = updateYtdlp();
    // Any update attempt may change the installed version — invalidate the check cache.
    clearVersionCache();
    return NextResponse.json({ success: status !== 'unknown', output, status });
  } catch {
    return NextResponse.json({ error: 'Failed to update yt-dlp.' }, { status: 500 });
  }
}
