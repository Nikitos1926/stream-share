import { signIn, signOut } from '@/lib/auth/auth';
import {
  encodeHandoffRequest,
  handoffRequestSchema,
  HANDOFF_COMPLETE_PATH,
  HANDOFF_COOKIE,
  HANDOFF_COOKIE_PATH,
  isSecureOrigin,
  REQUEST_TTL_SECONDS,
} from '@/lib/auth/desktopHandoff';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(req: NextRequest): Promise<Response> {
  const parsed = handoffRequestSchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return new NextResponse('Invalid desktop sign-in request.', { status: 400 });
  }

  await signOut({ redirect: false, redirectTo: HANDOFF_COMPLETE_PATH });

  const cookieStore = await cookies();
  cookieStore.set(HANDOFF_COOKIE, await encodeHandoffRequest(parsed.data), {
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecureOrigin(req),
    path: HANDOFF_COOKIE_PATH,
    maxAge: REQUEST_TTL_SECONDS,
  });

  await signIn('google', { redirectTo: HANDOFF_COMPLETE_PATH });

  return new NextResponse('Could not start the Google sign-in flow.', { status: 500 });
}
