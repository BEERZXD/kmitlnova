import { Readable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { createApiHandler } from './app.js';

class FakeRegistrarClient {
  static instances = [];

  constructor() {
    this.loggedIn = false;
    this.cleared = false;
    this.loginArgs = [];
    FakeRegistrarClient.instances.push(this);
  }

  async login(studentId, password) {
    this.loginArgs.push({ studentId, password });
    this.loggedIn = true;
  }

  async fetchReport(type, options) {
    if (!this.loggedIn) throw new Error('Not logged in.');
    return { type, student: { id: this.loginArgs[0]?.studentId ?? '' }, options };
  }

  clear() {
    this.loggedIn = false;
    this.cleared = true;
  }
}

describe('API session security', () => {
  it('keeps registrar sessions per HttpOnly browser session cookie', async () => {
    FakeRegistrarClient.instances = [];
    const handleApi = createApiHandler({ Client: FakeRegistrarClient });

    const firstLogin = await request(handleApi, {
      method: 'POST',
      path: '/api/login',
      body: { studentId: '66010001', password: 'secret-one' },
    });
    const secondLogin = await request(handleApi, {
      method: 'POST',
      path: '/api/login',
      body: { studentId: '66010002', password: 'secret-two' },
    });

    const firstCookie = firstLogin.cookie;
    const secondCookie = secondLogin.cookie;
    expect(firstCookie).toContain('kn_session=');
    expect(firstCookie).toContain('HttpOnly');
    expect(firstCookie).toContain('SameSite=Lax');
    expect(firstCookie).not.toContain('secret-one');
    expect(secondCookie).not.toBe(firstCookie);

    const firstReport = await request(handleApi, {
      method: 'GET',
      path: '/api/reports/study',
      cookie: firstCookie,
    });
    const secondReport = await request(handleApi, {
      method: 'GET',
      path: '/api/reports/study',
      cookie: secondCookie,
    });

    expect(firstReport.json.student.id).toBe('66010001');
    expect(secondReport.json.student.id).toBe('66010002');
    expect(FakeRegistrarClient.instances).toHaveLength(2);
  });

  it('clears only the current in-memory session on logout', async () => {
    FakeRegistrarClient.instances = [];
    const handleApi = createApiHandler({ Client: FakeRegistrarClient });

    const login = await request(handleApi, {
      method: 'POST',
      path: '/api/login',
      body: { studentId: '66010001', password: 'secret' },
    });

    const logout = await request(handleApi, {
      method: 'POST',
      path: '/api/logout',
      cookie: login.cookie,
    });

    expect(logout.json).toEqual({ loggedIn: false });
    expect(logout.cookie).toContain('Max-Age=0');
    expect(FakeRegistrarClient.instances[0].cleared).toBe(true);

    const session = await request(handleApi, {
      method: 'GET',
      path: '/api/session',
      cookie: login.cookie,
    });

    expect(session.json).toEqual({ loggedIn: false });
  });
});

async function request(handleApi, { method, path, body, cookie }) {
  const req = body
    ? Readable.from([Buffer.from(JSON.stringify(body))])
    : Readable.from([]);
  req.method = method;
  req.url = path;
  req.headers = {
    host: '127.0.0.1:8787',
    ...(cookie ? { cookie } : {}),
  };

  const chunks = [];
  const res = {
    statusCode: 0,
    headers: {},
    writeHead(status, headers) {
      this.statusCode = status;
      this.headers = { ...this.headers, ...headers };
    },
    end(chunk) {
      if (chunk) chunks.push(Buffer.from(chunk));
    },
  };

  await handleApi(req, res, new URL(path, 'http://127.0.0.1:8787'));

  const text = Buffer.concat(chunks).toString('utf8');
  return {
    status: res.statusCode,
    headers: res.headers,
    cookie: Array.isArray(res.headers['Set-Cookie']) ? res.headers['Set-Cookie'][0] : res.headers['Set-Cookie'],
    json: JSON.parse(text),
  };
}
