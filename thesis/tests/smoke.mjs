#!/usr/bin/env node
/**
 * Smoke checks behind Розділ 5 of the thesis: drive the real web (Next.js) and
 * signaling (Fastify + mediasoup) servers over HTTP and WebSocket, without a
 * browser. Media itself (capture, encoding, playback) is NOT exercised here —
 * that needs real browsers and is listed as user data in the chapter.
 *
 * Prerequisites (see thesis/tests/README.md): PostgreSQL with the schema pushed,
 * signaling on SIGNALING (default http://127.0.0.1:4000) and web on WEB
 * (default http://127.0.0.1:3000), both started with NODE_ENV=production and the
 * same AUTH_SECRET / DATABASE_URL exported to this script.
 *
 * Usage: node thesis/tests/smoke.mjs            (from the repository root)
 */
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const fromSignaling = createRequire(path.join(root, 'apps/signaling/package.json'));
const fromDb = createRequire(path.join(root, 'packages/db/package.json'));
// `ws` is not a direct dependency of signaling; take the copy @fastify/websocket uses.
const WebSocket = createRequire(fromSignaling.resolve('@fastify/websocket'))('ws');
const { encode } = await import(fromSignaling.resolve('@auth/core/jwt'));
const pg = fromDb('pg');

const WEB = process.env.WEB ?? 'http://127.0.0.1:3000';
const SIGNALING = process.env.SIGNALING ?? 'http://127.0.0.1:4000';
const WS_BASE = SIGNALING.replace(/^http/, 'ws');
const COOKIE = '__Secure-authjs.session-token'; // NODE_ENV=production name
const { AUTH_SECRET, DATABASE_URL } = process.env;
if (!AUTH_SECRET || !DATABASE_URL) throw new Error('export AUTH_SECRET and DATABASE_URL');

const results = [];
const check = (id, title, ok, detail) => {
  results.push({ id, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${id}  ${title}${detail ? ` — ${detail}` : ''}`);
};

const db = new pg.Client({ connectionString: DATABASE_URL });
await db.connect();
const query = async (sql, args) => (await db.query(sql, args)).rows;

// A signed-in Google user is modelled by a `user` row and a session JWT minted
// exactly as Auth.js mints it (same encode(), secret and salt = cookie name).
const mintSession = async (userId, role) =>
  `${COOKIE}=${await encode({ salt: COOKIE, secret: AUTH_SECRET, token: { sub: userId, role } })}`;

const http = (url, { cookie, method = 'GET', body } = {}) =>
  fetch(url, {
    method,
    redirect: 'manual',
    headers: {
      ...(cookie ? { cookie } : {}),
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

/** Opens a socket; resolves with { ws, next(pred) } or rejects with the HTTP status. */
const openWs = (url, cookie) =>
  new Promise((resolve, reject) => {
    const ws = new WebSocket(url, { headers: cookie ? { cookie } : {} });
    const inbox = [];
    const waiters = [];
    ws.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      const i = waiters.findIndex((w) => w.pred(msg));
      if (i >= 0) waiters.splice(i, 1)[0].resolve(msg);
      else inbox.push(msg);
    });
    ws.on('unexpected-response', (_req, res) => reject(new Error(`HTTP ${res.statusCode}`)));
    ws.on('error', reject);
    ws.on('open', () => {
      let requestId = 0;
      const next = (pred, timeoutMs = 60_000) => {
        const i = inbox.findIndex(pred);
        if (i >= 0) return Promise.resolve(inbox.splice(i, 1)[0]);
        return new Promise((res, rej) => {
          const t = setTimeout(() => rej(new Error('timeout')), timeoutMs);
          waiters.push({ pred, resolve: (m) => (clearTimeout(t), res(m)) });
        });
      };
      const call = (method, params = null) => {
        const id = ++requestId;
        ws.send(JSON.stringify({ type: 'req', method, params, requestId: id }));
        return next((m) => m.type === 'res' && m.requestId === id);
      };
      resolve({ ws, next, call });
    });
  });

const wsStatus = (url, cookie) =>
  openWs(url, cookie).then(
    ({ ws }) => (ws.close(), 'open'),
    (e) => e.message,
  );

const fakeVideo = {
  kind: 'video',
  last: true,
  maxBitrate: 6_530_000,
  rtpParameters: {
    mid: '0',
    codecs: [{ mimeType: 'video/VP8', payloadType: 96, clockRate: 90000, parameters: {} }],
    headerExtensions: [],
    encodings: [{ ssrc: 22_222_222 }],
    rtcp: { cname: 'smoke' },
  },
};

// ---------------------------------------------------------------- web: route gate
{
  const r = await http(`${WEB}/broadcast`);
  check(
    'А1',
    'анонімний запит /broadcast',
    r.status === 307 && r.headers.get('location')?.endsWith('/login'),
    `${r.status} → ${r.headers.get('location')}`,
  );
  const w = await http(`${WEB}/${randomUUID()}/watch`);
  check('А2', 'анонімний запит сторінки перегляду', w.status === 200, `${w.status}`);
}

// ---------------------------------------------------------------- web: guest sign-in
let guestCookie;
let guestId;
{
  const csrfRes = await http(`${WEB}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  const csrfCookie = csrfRes.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .join('; ');
  const res = await fetch(`${WEB}/api/auth/callback/guest`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: csrfCookie },
    body: new URLSearchParams({ csrfToken, userId: '', json: 'true' }),
  });
  const session = res.headers.getSetCookie().find((c) => c.startsWith(`${COOKIE}=`));
  const flags =
    session
      ?.split(';')
      .slice(1)
      .map((s) => s.trim().split('=')[0].toLowerCase()) ?? [];
  check(
    'А3',
    'гостьовий вхід видає cookie сеансу',
    !!session,
    session ? `атрибути: ${flags.join(', ')}` : `${res.status}`,
  );
  check(
    'А4',
    'cookie сеансу: HttpOnly, Secure, SameSite',
    ['httponly', 'secure', 'samesite'].every((f) => flags.includes(f)),
  );
  guestCookie = session?.split(';')[0];
  const me = await (await http(`${WEB}/api/auth/session`, { cookie: guestCookie })).json();
  guestId = me?.user?.id;
  const [row] = await query('select role, name from "user" where id = $1', [guestId]);
  check(
    'А5',
    'гостя збережено в БД з роллю guest',
    row?.role === 'guest',
    `name="${row?.name}"`,
  );
  const b = await http(`${WEB}/broadcast`, { cookie: guestCookie });
  check(
    'А6',
    'гість не має доступу до /broadcast',
    b.status === 307,
    `${b.status} → ${b.headers.get('location')}`,
  );
}

// ---------------------------------------------------------------- signaling: auth
const [streamer] = await query(
  `insert into "user"(id, name, email, role) values ($1, 'Smoke Streamer', $2, 'user') returning id`,
  [randomUUID(), `smoke-${randomUUID()}@example.test`],
);
const streamerCookie = await mintSession(streamer.id, 'user');
{
  const r1 = await http(`${SIGNALING}/streams`, { method: 'POST', body: {} });
  const r2 = await http(`${SIGNALING}/streams`, {
    method: 'POST',
    body: {},
    cookie: `${COOKIE}=forged.token.value`,
  });
  check(
    'А7',
    'REST без токена / з підробленим токеном',
    r1.status === 401 && r2.status === 401,
    `${r1.status} / ${r2.status}`,
  );
  const ws = await wsStatus(`${WS_BASE}/ws/streams/${randomUUID()}/broadcast`);
  check('А8', 'WebSocket без токена', ws === 'HTTP 401', ws);
}

// ---------------------------------------------------------------- broadcast
let publicId;
let privateId;
{
  const pub = await (
    await http(`${SIGNALING}/streams`, {
      method: 'POST',
      body: { isPrivate: false },
      cookie: streamerCookie,
    })
  ).json();
  const priv = await (
    await http(`${SIGNALING}/streams`, {
      method: 'POST',
      body: { isPrivate: true },
      cookie: streamerCookie,
    })
  ).json();
  publicId = pub.data?.id;
  privateId = priv.data?.id;
  check(
    'Б1',
    'створення публічної та приватної трансляцій',
    !!publicId && !!privateId,
    `status=${pub.data?.status}`,
  );

  const s = await openWs(`${WS_BASE}/ws/streams/${publicId}/broadcast`, streamerCookie);
  const caps = await s.call('getRtpCapabilities');
  const order = caps.result.codecs
    .filter((c) => c.kind === 'video' && !/rtx/i.test(c.mimeType))
    .map((c) => c.mimeType);
  check(
    'Б2',
    'RTP-можливості маршрутизатора',
    caps.ok && order[0] === 'video/H264',
    order.join(', '),
  );
  const t = await s.call('createTransport', { direction: 'send' });
  const ips = [...new Set(t.result.iceCandidates.map((c) => `${c.protocol}/${c.address}`))];
  check('Б3', 'транспорт стрімера', t.ok && ips.length > 0, ips.join(', '));
  const p = await s.call('produce', fakeVideo);
  const [st] = await query('select status from stream where id = $1', [publicId]);
  check(
    'Б4',
    'produce(last=true) переводить трансляцію в live',
    p.ok && st.status === 'live',
    `status=${st.status}`,
  );

  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
  const upload = (cookie) =>
    fetch(`${SIGNALING}/streams/${publicId}/thumbnail`, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/octet-stream' },
      body: jpeg,
    });
  const own = await upload(streamerCookie);
  const foreign = await upload(guestCookie);
  check(
    'Б6',
    'мініатюру завантажує лише власник',
    own.status === 200 && foreign.status === 403,
    `власник ${own.status}, інший сеанс ${foreign.status}`,
  );

  const list = await (
    await http(`${SIGNALING}/streams/search`, { method: 'POST', body: {}, cookie: guestCookie })
  ).json();
  const ids = list.data.map((x) => x.id);
  check(
    'П1',
    'приватна трансляція відсутня в списку',
    ids.includes(publicId) && !ids.includes(privateId),
    `у списку ${list.meta.count}`,
  );
  const direct = await http(`${SIGNALING}/streams/${privateId}`);
  check(
    'П2',
    'приватна трансляція доступна за прямим ідентифікатором',
    direct.status === 200,
    `${direct.status}`,
  );
  const missing = await http(`${SIGNALING}/streams/${randomUUID()}`);
  check('П3', 'неіснуюча трансляція', missing.status === 404, `${missing.status}`);

  // ------------------------------------------------------------ viewer (guest)
  const v = await openWs(`${WS_BASE}/ws/streams/${publicId}/watch`, guestCookie);
  const join = await v.call('joinStream');
  check(
    'П4',
    'гість приєднується до трансляції',
    join.ok && join.result.producerIds.length === 1,
    `producers=${join.result?.producerIds?.length}`,
  );
  const vt = await v.call('createTransport', { direction: 'recv' });
  const c = await v.call('consume', {
    producerId: join.result.producerIds[0],
    rtpCapabilities: join.result.rtpCapabilities,
  });
  check(
    'П5',
    'створення споживача для глядача',
    vt.ok && c.ok && c.result.kind === 'video',
    c.result?.rtpParameters?.codecs?.[0]?.mimeType,
  );

  // ------------------------------------------------------------ disconnect / timeout
  const t0 = Date.now();
  s.ws.terminate();
  const ev1 = await v.next((m) => m.type === 'event' && m.name === 'streamerDisconnect');
  check('З1', 'глядач отримує streamerDisconnect', !!ev1, `${Date.now() - t0} мс`);
  const ev2 = await v.next((m) => m.type === 'event' && m.name === 'streamEnd', 90_000);
  const elapsed = Date.now() - t0;
  // The event is sent before the DB update settles; give the write a moment.
  await new Promise((r) => setTimeout(r, 1000));
  const [ended] = await query(
    'select status, "endReason" as end_reason from stream where id = $1',
    [publicId],
  );
  check(
    'З2',
    'трансляція завершується за тайм-аутом',
    !!ev2 && ended.status === 'ended',
    `${(elapsed / 1000).toFixed(1)} с, end_reason=${ended.end_reason}`,
  );
  v.ws.close();
}

// ---------------------------------------------------------------- explicit end
{
  const s = await openWs(`${WS_BASE}/ws/streams/${privateId}/broadcast`, streamerCookie);
  await s.call('createTransport', { direction: 'send' });
  await s.call('produce', fakeVideo);
  const v = await openWs(`${WS_BASE}/ws/streams/${privateId}/watch`, guestCookie);
  await v.call('joinStream');
  const end = await s.call('endStream');
  s.ws.close();
  const ev = await v.next((m) => m.type === 'event' && m.name === 'streamEnd', 10_000);
  const [row] = await query('select status, "endReason" as end_reason from stream where id = $1', [
    privateId,
  ]);
  check(
    'З3',
    'завершення трансляції стрімером',
    end.ok && !!ev && row.status === 'ended',
    `end_reason=${row.end_reason}`,
  );
  v.ws.close();
}

// ---------------------------------------------------------------- authorization probes
{
  const g = await http(`${SIGNALING}/streams`, { method: 'POST', body: {}, cookie: guestCookie });
  check(
    'Б5',
    'гість не може створити трансляцію через REST',
    g.status === 401 || g.status === 403,
    `${g.status}`,
  );
  if (g.ok) {
    const { data } = await g.json();
    await query(
      'update stream set status = $1, "endReason" = $2, "endedAt" = now() where id = $3',
      ['ended', 'streamer_stop', data.id],
    );
  }
  // A live stream of `streamer`; a guest session tries to act as its broadcaster.
  const own = await (
    await http(`${SIGNALING}/streams`, { method: 'POST', body: {}, cookie: streamerCookie })
  ).json();
  const s = await openWs(`${WS_BASE}/ws/streams/${own.data.id}/broadcast`, streamerCookie);
  await s.call('createTransport', { direction: 'send' });
  await s.call('produce', fakeVideo);
  let foreign;
  try {
    foreign = await openWs(`${WS_BASE}/ws/streams/${own.data.id}/broadcast`, guestCookie);
  } catch (e) {
    foreign = e.message;
  }
  let detail = typeof foreign === 'string' ? foreign : "з'єднання відкрито";
  if (typeof foreign !== 'string') {
    const end = await foreign.call('endStream');
    const [row] = await query(
      'select status, "endReason" as end_reason from stream where id = $1',
      [own.data.id],
    );
    detail += `; endStream від гостя: ok=${end.ok}, status=${row.status}`;
    foreign.ws.close();
  }
  check(
    'З4',
    'чужий користувач не може керувати трансляцією',
    typeof foreign === 'string',
    detail,
  );
  s.ws.close();
  await query(
    'update stream set status = $1, "endReason" = $2, "endedAt" = now() where id = $3 and status <> $1',
    ['ended', 'streamer_stop', own.data.id],
  );
}

await db.end();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
