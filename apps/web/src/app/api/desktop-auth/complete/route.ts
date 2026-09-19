import { auth } from '@/lib/auth/auth';
import {
  decodeHandoffRequest,
  encodeHandoffCode,
  HANDOFF_COOKIE,
  HANDOFF_COOKIE_PATH,
  HANDOFF_RETURN_PATH,
  loopbackUrl,
} from '@/lib/auth/desktopHandoff';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(req: NextRequest): Promise<Response> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(HANDOFF_COOKIE)?.value;
  const request = raw ? await decodeHandoffRequest(raw) : null;
  if (raw) cookieStore.delete({ name: HANDOFF_COOKIE, path: HANDOFF_COOKIE_PATH });

  if (!request) {
    return NextResponse.redirect(new URL(HANDOFF_RETURN_PATH, req.nextUrl.origin));
  }

  const session = await auth();
  if (!session?.user?.id || session.user.role === 'guest') {
    return NextResponse.redirect(loopbackUrl(request, { error: 'access_denied' }));
  }

  const code = await encodeHandoffCode(session.user.id, request.challenge);
  return NextResponse.redirect(loopbackUrl(request, { code }));
}
