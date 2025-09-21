import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { ACCESS_COOKIE_NAME } from '@/lib/auth';

export async function POST() {
  cookies().delete(ACCESS_COOKIE_NAME);

  return NextResponse.json({ success: true });
}
