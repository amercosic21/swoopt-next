import { NextResponse } from 'next/server';
import { getStats } from '@/lib/Settings';

export async function GET() {
  try {
    return NextResponse.json(getStats());
  } catch {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
