import { createReadStream, existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { RegistrarClient } from './registrar/client.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const distDir = join(root, 'dist');
const SESSION_COOKIE = 'kn_session';
const SESSION_TTL_MS = 30 * 60 * 1000;
const MAX_BODY_BYTES = 16 * 1024;

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "script-src 'self'",
    "connect-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
  ].join('; '),
};

export function createSessionStore({ Client = RegistrarClient, ttlMs = SESSION_TTL_MS, now = () => Date.now() } = {}) {
  const sessions = new Map();

  function prune() {
    const current = now();
    for (const [id, session] of sessions.entries()) {
      if (session.expiresAt <= current) {
        session.client.clear();
        sessions.delete(id);
      }
    }
  }

  return {
    create() {
      prune();
      const id = randomBytes(32).toString('base64url');
      const client = new Client();
      sessions.set(id, { client, expiresAt: now() + ttlMs });
      return { id, client };
    },
    get(id) {
      if (!id) return null;
      prune();
      const session = sessions.get(id);
      if (!session) return null;
      session.expiresAt = now() + ttlMs;
      return session.client;
    },
    destroy(id) {
      const session = sessions.get(id);
      if (session) session.client.clear();
      sessions.delete(id);
    },
    size() {
      prune();
      return sessions.size;
    },
  };
}

const defaultSessionStore = createSessionStore();

function isSecureRequest(req) {
  const proto = req.headers['x-forwarded-proto'];
  if (String(proto).split(',')[0] === 'https') return true;
  const host = String(req.headers.host ?? '');
  return !/^localhost(?::|$)|^127\.0\.0\.1(?::|$)/.test(host);
}

function sessionCookie(id, req, maxAge = SESSION_TTL_MS / 1000) {
  return [
    `${SESSION_COOKIE}=${id}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.floor(maxAge)}`,
    ...(isSecureRequest(req) ? ['Secure'] : []),
  ].join('; ');
}

function expiredSessionCookie(req) {
  return sessionCookie('', req, 0);
}

function parseCookies(header = '') {
  const cookies = new Map();
  for (const part of String(header).split(';')) {
    const index = part.indexOf('=');
    if (index <= 0) continue;
    cookies.set(part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim()));
  }
  return cookies;
}

function sendJson(res, status, data, headers = {}) {
  res.writeHead(status, {
    ...securityHeaders,
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers,
  });
  res.end(JSON.stringify(data));
}

async function readBody(req) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_BODY_BYTES) {
      const error = new Error('Request body is too large.');
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function normalizeError(error) {
  const message = error instanceof Error ? error.message : 'Unknown error.';
  if (error?.code === 'INVALID_LOGIN') return { code: 'INVALID_LOGIN', message };
  if (error?.code === 'SESSION_EXPIRED') return { code: 'SESSION_EXPIRED', message };
  if (error?.code === 'REGISTRAR_CHANGED') return { code: 'REGISTRAR_CHANGED', message };
  if (/password|rejected|invalid/i.test(message)) return { code: 'INVALID_LOGIN', message };
  if (/à¹„à¸¡à¹ˆà¸žà¸šà¸£à¸«à¸±à¸ªà¸™à¸±à¸à¸¨à¸¶à¸à¸©à¸²à¸«à¸£à¸·à¸­à¸£à¸«à¸±à¸ªà¸œà¹ˆà¸²à¸™à¹ƒà¸™à¸£à¸°à¸šà¸š/.test(message)) return { code: 'INVALID_LOGIN', message };
  if (/expired|not logged in/i.test(message)) return { code: 'SESSION_EXPIRED', message };
  if (/parse|recognized|form/i.test(message)) return { code: 'REGISTRAR_CHANGED', message };
  return { code: 'REGISTRAR_ERROR', message };
}

export function createApiHandler({ Client = RegistrarClient, sessionStore = createSessionStore({ Client }) } = {}) {
  return async function handleApi(req, res, url) {
    const sessionId = parseCookies(req.headers.cookie).get(SESSION_COOKIE) ?? '';
    const currentClient = () => sessionStore.get(sessionId);

    try {
      if (req.method === 'GET' && url.pathname === '/api/session') {
        sendJson(res, 200, { loggedIn: currentClient()?.loggedIn === true });
        return;
      }

      if (req.method === 'POST' && url.pathname === '/api/login') {
        if (sessionId) sessionStore.destroy(sessionId);
        const { studentId, password } = await readBody(req);
        if (!studentId || !password) {
          sendJson(res, 400, { error: { code: 'MISSING_CREDENTIALS', message: 'Student ID and password are required.' } }, {
            'Set-Cookie': expiredSessionCookie(req),
          });
          return;
        }
        const { id, client } = sessionStore.create();
        try {
          await client.login(studentId, password);
        } catch (error) {
          sessionStore.destroy(id);
          throw error;
        }
        sendJson(res, 200, { loggedIn: true }, { 'Set-Cookie': sessionCookie(id, req) });
        return;
      }

      if (req.method === 'POST' && url.pathname === '/api/logout') {
        if (sessionId) sessionStore.destroy(sessionId);
        sendJson(res, 200, { loggedIn: false }, { 'Set-Cookie': expiredSessionCookie(req) });
        return;
      }

      const reportMatch = url.pathname.match(/^\/api\/reports\/(study|exam|grade)$/);
      if (req.method === 'GET' && reportMatch) {
        const client = currentClient();
        if (!client) throw new Error('Not logged in.');
        const report = await client.fetchReport(reportMatch[1], {
          semester: url.searchParams.get('semester') || undefined,
          year: url.searchParams.get('year') || undefined,
          examKind: url.searchParams.get('examKind') || undefined,
        });
        sendJson(res, 200, report);
        return;
      }

      sendJson(res, 404, { error: { code: 'NOT_FOUND', message: 'API route not found.' } });
    } catch (error) {
      const normalized = normalizeError(error);
      console.error(`[api] ${normalized.code}: ${normalized.message}`);
      const status = error?.status ?? (normalized.code === 'INVALID_LOGIN'
        ? 401
        : normalized.code === 'SESSION_EXPIRED'
          ? 440
          : 500);
      sendJson(res, status, { error: normalized });
    }
  };
}

export const handleApi = createApiHandler({ sessionStore: defaultSessionStore });

export function serveStatic(req, res, url) {
  if (!existsSync(distDir)) {
    sendJson(res, 200, {
      message: 'KMITL Nova backend is running. Start Vite with npm run dev or build the frontend with npm run build.',
    });
    return;
  }

  const pathname = url.pathname === '/' ? '/index.html' : url.pathname;
  const resolved = normalize(join(distDir, pathname));
  if (!resolved.startsWith(distDir) || !existsSync(resolved)) {
    res.writeHead(200, {
      ...securityHeaders,
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    createReadStream(join(distDir, 'index.html')).pipe(res);
    return;
  }

  res.writeHead(200, {
    ...securityHeaders,
    'Content-Type': mime[extname(resolved)] ?? 'application/octet-stream',
    'Cache-Control': resolved.includes(`${distDir}\\assets\\`) || resolved.includes(`${distDir}/assets/`)
      ? 'public, max-age=31536000, immutable'
      : 'no-store',
  });
  createReadStream(resolved).pipe(res);
}

export async function requestListener(req, res) {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? '127.0.0.1'}`);

  if (url.pathname.startsWith('/api/')) {
    await handleApi(req, res, url);
    return;
  }

  serveStatic(req, res, url);
}
