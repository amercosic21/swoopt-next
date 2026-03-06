import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { DOWNLOADS_DIR } from '@/lib/config';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: segments } = await params;
    // Sanitize: prevent path traversal
    // Reject path traversal segments but preserve dots in filenames
    if (segments.some(s => s === '..' || s === '.')) {
      return new NextResponse('Forbidden', { status: 403 });
    }
    const safePath = segments.filter(Boolean).join('/');

    const filePath = path.join(DOWNLOADS_DIR, safePath);

    // Ensure the file is within DOWNLOADS_DIR
    if (!filePath.startsWith(DOWNLOADS_DIR)) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      return new NextResponse('Not found', { status: 404 });
    }

    const stat = fs.statSync(filePath);
    const fileBuffer = fs.readFileSync(filePath);
    const filename = path.basename(filePath);

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'Content-Length': String(stat.size),
      },
    });
  } catch {
    return new NextResponse('Server error', { status: 500 });
  }
}
