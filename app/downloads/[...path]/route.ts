import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { DOWNLOADS_DIR } from '@/lib/config';

/** Stream a completed download. Supports HTTP Range so browsers can resume/seek
 *  and large files are never buffered fully into memory. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: segments } = await params;
    // Reject path traversal but keep dots in filenames
    if (segments.some(s => s === '..' || s === '.')) {
      return new NextResponse('Forbidden', { status: 403 });
    }
    const safePath = segments.filter(Boolean).join('/');
    const filePath = path.join(DOWNLOADS_DIR, safePath);

    // Ensure the resolved path stays within DOWNLOADS_DIR
    if (!filePath.startsWith(DOWNLOADS_DIR)) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    let stat: fs.Stats;
    try {
      stat = fs.statSync(filePath);
    } catch {
      return new NextResponse('Not found', { status: 404 });
    }
    if (!stat.isFile()) return new NextResponse('Not found', { status: 404 });

    const size = stat.size;
    const filename = path.basename(filePath);
    const headers: Record<string, string> = {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      'Accept-Ranges': 'bytes',
    };

    // Partial content (Range request): bytes=start-end, bytes=start-, bytes=-suffix
    const range = req.headers.get('range');
    const match = range && /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (match) {
      let start = match[1] === '' ? 0 : parseInt(match[1], 10);
      let end = match[2] === '' ? size - 1 : parseInt(match[2], 10);
      if (match[1] === '' && match[2] !== '') {
        // suffix range: last N bytes
        start = Math.max(0, size - parseInt(match[2], 10));
        end = size - 1;
      }
      if (isNaN(start) || isNaN(end) || start > end || start >= size) {
        return new NextResponse('Range Not Satisfiable', {
          status: 416,
          headers: { 'Content-Range': `bytes */${size}` },
        });
      }
      end = Math.min(end, size - 1);
      const stream = Readable.toWeb(fs.createReadStream(filePath, { start, end })) as unknown as ReadableStream;
      return new NextResponse(stream, {
        status: 206,
        headers: { ...headers, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': String(end - start + 1) },
      });
    }

    const stream = Readable.toWeb(fs.createReadStream(filePath)) as unknown as ReadableStream;
    return new NextResponse(stream, {
      status: 200,
      headers: { ...headers, 'Content-Length': String(size) },
    });
  } catch {
    return new NextResponse('Server error', { status: 500 });
  }
}
