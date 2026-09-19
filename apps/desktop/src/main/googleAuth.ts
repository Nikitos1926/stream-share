import { shell, type BrowserWindow } from 'electron';
import { createHash, randomBytes } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { bringWindowToFront } from './windowFocus';

const SIGN_IN_TIMEOUT_MS = 5 * 60 * 1000;

export type GoogleSignInResult =
  | { status: 'success'; code: string; verifier: string }
  | { status: 'cancelled' }
  | { status: 'timeout' }
  | { status: 'error'; message: string };

type Pending = {
  server: Server;
  settle: (result: GoogleSignInResult) => void;
  /** Handed to any later caller that arrives while this attempt is running. */
  result: Promise<GoogleSignInResult>;
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
  res.end(body, () => onSent?.());
}

const listen = (server: Server) =>
  new Promise<number>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.removeListener('error', reject);
      const address = server.address() as AddressInfo | null;
      if (address) resolve(address.port);
      else reject(new Error('Loopback listener reported no address'));
    });
  });

export function startGoogleSignIn(window: BrowserWindow): Promise<GoogleSignInResult> {
  if (pending) return pending.result;

  const verifier = base64url(randomBytes(32));
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  const state = base64url(randomBytes(16));

  const server = createServer();

  let settleAttempt: (result: GoogleSignInResult) => void = () => {};

  const attempt = new Promise<GoogleSignInResult>((resolve) => {
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

    server.on('error', (error) =>
      settle({ status: 'error', message: error.message || 'The sign-in listener failed' }),
    );

    server.on('request', (req, res) => {
      const url = new URL(req.url ?? '/', 'http://127.0.0.1');
      if (url.pathname !== '/callback') {
        respond(res, 404, 'Not found.');
        return;
      }

      if (url.searchParams.get('state') !== state) {
        respond(res, 400, 'This sign-in link does not belong to this app.');
        return;
      }

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

      bringWindowToFront(window);

      respond(res, 200, 'Signed in. You can close this tab and return to Stream Share.', () =>
        settle({ status: 'success', code, verifier }),
      );
    });

    settleAttempt = settle;

    void (async () => {
      try {
        const port = await listen(server);

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

  pending = { server, settle: settleAttempt, result: attempt };

  return attempt;
}

export function cancelGoogleSignIn(): void {
  pending?.settle({ status: 'cancelled' });
  pending = null;
}
