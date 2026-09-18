import { shell, type BrowserWindow } from 'electron';
import { createHash, randomBytes } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { bringWindowToFront } from './windowFocus';

/**
 * Desktop side of the system-browser sign-in.
 *
 * Google refuses OAuth in embedded user agents, so the account chooser is opened
 * with `shell.openExternal` and the result comes back over a loopback listener
 * on 127.0.0.1 with an ephemeral port. The app never talks to Google directly:
 * it opens the web app's `/api/desktop-auth/start`, which runs the existing
 * Auth.js flow in that browser and redirects here with a short-lived code. The
 * renderer then redeems the code through the `desktop` credentials provider, so
 * the session cookie is written into this app's cookie jar by Auth.js itself.
 *
 * The code is bound to a PKCE challenge whose verifier never leaves this
 * process, so another local process that sees the loopback URL cannot use it.
 */

/** Long enough to sign in to a Google account from scratch, short enough to give up. */
const SIGN_IN_TIMEOUT_MS = 5 * 60 * 1000;

export type GoogleSignInResult =
  | { status: 'success'; code: string; verifier: string }
  | { status: 'cancelled' }
  | { status: 'timeout' }
  | { status: 'error'; message: string };

type Pending = {
  server: Server;
  settle: (result: GoogleSignInResult) => void;
};

let pending: Pending | null = null;

const base64url = (bytes: Buffer) => bytes.toString('base64url');

function respond(
  res: import('node:http').ServerResponse,
  status: number,
  message: string,
  onSent?: () => void,
) {
  const body = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Stream Share</title>
    <style>
      body { background: #0a0a0a; color: #ededed; font-family: system-ui, sans-serif;
             display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
      div { text-align: center; }
      p { color: #a1a1a1; }
    </style>
  </head>
  <body>
    <div>
      <h1>Stream Share</h1>
      <p>${message}</p>
    </div>
  </body>
</html>`;

  res.writeHead(status, {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store',
    connection: 'close',
  });
  // The page has to be flushed before the listener is torn down, or the browser
  // shows a connection error instead of the "you can close this tab" message.
  res.end(body, () => onSent?.());
}

const listen = (server: Server) =>
  new Promise<number>((resolve, reject) => {
    // Guards the bind only, and is removed once the socket is up: from then on
    // the persistent listener that startGoogleSignIn attaches owns 'error', and
    // nothing here competes with it.
    server.once('error', reject);
    // Port 0 = an ephemeral port picked by the OS; bound to loopback only, so
    // nothing outside this machine can reach the callback.
    server.listen(0, '127.0.0.1', () => {
      server.removeListener('error', reject);
      const address = server.address() as AddressInfo | null;
      if (address) resolve(address.port);
      else reject(new Error('Loopback listener reported no address'));
    });
  });

/**
 * Opens the account chooser in the default browser and resolves once the browser
 * has handed the result back. Only one attempt runs at a time: starting a new
 * one cancels the previous, so a stuck flow can always be retried.
 */
export async function startGoogleSignIn(window: BrowserWindow): Promise<GoogleSignInResult> {
  cancelGoogleSignIn();

  const verifier = base64url(randomBytes(32));
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  const state = base64url(randomBytes(16));

  const server = createServer();

  return new Promise<GoogleSignInResult>((resolve) => {
    let done = false;
    const settle = (result: GoogleSignInResult) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (pending?.server === server) pending = null;
      server.close();
      server.closeAllConnections();
      resolve(result);
    };

    const timer = setTimeout(() => settle({ status: 'timeout' }), SIGN_IN_TIMEOUT_MS);

    // `listen` only guards the startup error. This listener has to stay for as
    // long as the server does: an 'error' with nothing listening for it is an
    // uncaught exception in the main process, and this server sits there for
    // minutes waiting for a browser. Any failure of it is a failure of the
    // attempt, so it settles instead of stranding the renderer.
    server.on('error', (error) =>
      settle({ status: 'error', message: error.message || 'The sign-in listener failed' }),
    );

    server.on('request', (req, res) => {
      const url = new URL(req.url ?? '/', 'http://127.0.0.1');
      if (url.pathname !== '/callback') {
        respond(res, 404, 'Not found.');
        return;
      }

      // Anything that does not carry the state this attempt generated is not
      // our callback: answer it, but keep waiting for the real one.
      if (url.searchParams.get('state') !== state) {
        respond(res, 400, 'This sign-in link does not belong to this app.');
        return;
      }

      // The web app reports a refused sign-in (no session, or a guest one) by
      // sending the attempt back with an error instead of a code, so the app can
      // say so rather than time out.
      const error = url.searchParams.get('error');
      const code = url.searchParams.get('code');
      if (error || !code) {
        respond(res, 200, 'Sign-in was not completed. You can close this tab and try again.', () =>
          settle({
            status: 'error',
            message:
              error === 'access_denied'
                ? 'The browser did not finish signing in to a Stream Share account.'
                : 'The browser could not complete the sign-in.',
          }),
        );
        return;
      }

      // The sign-in worked, so the user's next step is in the app: raise it
      // before the browser tab has finished rendering, so they see where they
      // ended up instead of being left in the browser. Only here — a refused,
      // cancelled or timed-out attempt leaves the window where it is.
      bringWindowToFront(window);

      respond(res, 200, 'Signed in. You can close this tab and return to Stream Share.', () =>
        settle({ status: 'success', code, verifier }),
      );
    });

    pending = { server, settle };

    void (async () => {
      try {
        const port = await listen(server);

        // Cancelled (or superseded) while the socket was still coming up: the
        // settle() above found nothing to close, so close it here and do not
        // open a browser for an attempt nobody is waiting on any more.
        if (done) {
          server.close();
          return;
        }

        const url = new URL('/api/desktop-auth/start', __WEB_URL__);
        url.searchParams.set('port', String(port));
        url.searchParams.set('state', state);
        url.searchParams.set('challenge', challenge);

        await shell.openExternal(url.toString());
      } catch (error) {
        settle({
          status: 'error',
          message: error instanceof Error ? error.message : 'Could not open the browser',
        });
      }
    })();
  });
}

/** Abandons a flow in progress (the user pressed cancel, or a new one started). */
export function cancelGoogleSignIn(): void {
  pending?.settle({ status: 'cancelled' });
  pending = null;
}
