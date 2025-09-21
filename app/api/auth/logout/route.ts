import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { ACCESS_COOKIE_NAME } from '@/lib/auth';

export async function POST() {
  const res = NextResponse.json({ success: true });
  // expire the cookie on the client
  res.cookies.set({ name: ACCESS_COOKIE_NAME, value: '', path: '/', expires: new Date(0) });
  return res;
}
