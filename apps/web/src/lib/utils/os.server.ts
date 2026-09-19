import 'server-only';
import { headers } from 'next/headers';
import { getOperatingSystem, Os } from './os.util';

/**
 * The visitor's OS as the *server* sees it: straight from the request's
 * `user-agent` header, which is the same string `navigator.userAgent` hands the
 * browser. Server Components read it here and pass it down, so the first client
 * render works from an identical value and the markup matches.
 *
 * It makes the rendered page vary by user agent, which is fine here: every route
 * that uses it already reads the session cookie, so nothing is statically
 * rendered or shared between visitors (and the Caddy in front does not cache).
 */
export async function getRequestOperatingSystem(): Promise<Os> {
  const userAgent = (await headers()).get('user-agent') ?? '';
  return getOperatingSystem(userAgent);
}
