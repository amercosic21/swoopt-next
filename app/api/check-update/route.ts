import { NextRequest, NextResponse } from 'next/server';
import { getUpdateInfo } from '@/lib/ytdlpVersion';
import { isLocalRequest } from '@/lib/apiHelpers';

export async function GET(req: NextRequest) {
  if (!isLocalRequest(req)) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  return NextResponse.json(await getUpdateInfo());
}
