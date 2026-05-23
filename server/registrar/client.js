import {
  buildAcademicOptions,
  mapRegistrationExamReport,
  mapRegistrationStudyReport,
} from './apiMappers.js';
import {
  parseExamReport,
  parseGradeReport,
  parseSelectionOptions,
  parseStudyReport,
} from './parsers.js';

const REPORT_URLS = {
  study: 'https://www.reg.kmitl.ac.th/u_student/report_studytable_show.php',
  exam: 'https://www.reg.kmitl.ac.th/u_student/report_examtable_show.php',
  grade: 'https://www.reg.kmitl.ac.th/u_student/report_gradetable_show.php',
};

const LOGIN_URL = 'https://www.reg.kmitl.ac.th/user/';
const USER_API_URL = 'https://api.reg.kmitl.ac.th/user/';
const REGISTRATION_API_URL = 'https://regis.reg.kmitl.ac.th/api/';
const KEYCLOAK_AUTH_URL = 'https://sso.reg.kmitl.ac.th/realms/registrar/protocol/openid-connect/auth';
const KEYCLOAK_TOKEN_URL = 'https://sso.reg.kmitl.ac.th/realms/registrar/protocol/openid-connect/token';
const KEYCLOAK_CLIENT_ID = 'KMITL-client';
const KEYCLOAK_REDIRECT_URI = 'https://regis.reg.kmitl.ac.th/';
const LEGACY_LOGIN_URL = 'https://www.reg.kmitl.ac.th/user/login.php';
const LEGACY_INFO_URL = 'https://www.reg.kmitl.ac.th/index/index_api.php?function=get-info';

const USERNAME_FIELDS = [
  'student_id',
  'studentid',
  'student',
  'username',
  'user',
  'login',
  'login_id',
  'userid',
  'uid',
  'f_uid',
  'txtUserName',
];

const PASSWORD_FIELDS = [
  'password',
  'passwd',
  'pass',
  'pwd',
  'f_pwd',
  'txtPassword',
];

function decodeHtmlAttribute(value) {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function getSetCookie(headers) {
  if (typeof headers.getSetCookie === 'function') return headers.getSetCookie();
  const single = headers.get('set-cookie');
  if (!single) return [];
  return single.split(/,(?=[^;,]+=[^;,]+)/g);
}

function parseForm(html) {
  const formMatch = html.match(/<form\b([^>]*)>([\s\S]*?)<\/form>/i);
  if (!formMatch) return null;

  const attrs = formMatch[1];
  const body = formMatch[2];
  const action = decodeHtmlAttribute(attrs.match(/\baction=["']?([^"'\s>]+)/i)?.[1] ?? '');
  const method = attrs.match(/\bmethod=["']?([^"'\s>]+)/i)?.[1]?.toUpperCase() ?? 'GET';
  const fields = new Map();

  for (const input of body.matchAll(/<input\b([^>]*)>/gi)) {
    const raw = input[1];
    const name = raw.match(/\bname=["']?([^"'\s>]+)/i)?.[1];
    if (!name) continue;
    const value = decodeHtmlAttribute(raw.match(/\bvalue=["']?([^"'>]*)/i)?.[1] ?? '');
    fields.set(name, value);
  }

  return { action, method, fields };
}

function findField(fields, candidates, fallbackPattern) {
  for (const candidate of candidates) {
    for (const key of fields.keys()) {
      if (key.toLowerCase() === candidate.toLowerCase()) return key;
    }
  }

  for (const key of fields.keys()) {
    if (fallbackPattern.test(key)) return key;
  }

  return '';
}

function toSsoUsername(studentId) {
  const value = String(studentId).trim();
  if (value.includes('@')) return value;
  return `${value}@kmitl.ac.th`;
}

function extractToken(data) {
  if (!data || typeof data !== 'object') return '';
  return data.token ?? data.access_token ?? data.jwt ?? data.data?.token ?? '';
}

function getRegistrarMessage(data, body) {
  if (data && typeof data === 'object') {
    return String(data.message ?? data.error ?? data.status ?? '');
  }
  return body;
}

function isCredentialRejection(response, data, body) {
  const message = getRegistrarMessage(data, body);
  return response.status === 401 || /incorrect username|invalid|password|unauthorized/i.test(message);
}

function createRegistrarError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function hasAuthenticatedReport(html) {
  return (
    html.includes('\u0e23\u0e2b\u0e31\u0e2a\u0e27\u0e34\u0e0a\u0e32') ||
    html.includes('\u0e27\u0e31\u0e19-\u0e40\u0e27\u0e25\u0e32\u0e40\u0e23\u0e35\u0e22\u0e19') ||
    html.includes('\u0e40\u0e27\u0e25\u0e32\u0e2a\u0e2d\u0e1a') ||
    html.includes('รหัสวิชา') ||
    html.includes('วัน-เวลาเรียน') ||
    html.includes('เวลาสอบ') ||
    html.includes('รหัสวิชา') ||
    html.includes('Course No.') ||
    html.includes('Cumulation') ||
    html.includes('วัน-เวลาเรียน') ||
    html.includes('เวลาสอบ')
  );
}

function hasLoginFailure(html) {
  return /invalid|incorrect|ผิด|ไม่ถูกต้อง|login failed|password/i.test(html);
}

function candidateAcademicYears(currentYear, requestedYear) {
  const start = Number(currentYear) || new Date().getFullYear() + 543;
  const values = new Set();
  if (requestedYear) values.add(String(requestedYear));
  for (let index = 0; index < 8; index += 1) {
    values.add(String(start - index));
  }
  return [...values].sort((a, b) => Number(b) - Number(a));
}

async function decodeResponseBody(response) {
  const buffer = await response.arrayBuffer();
  const contentType = response.headers.get('content-type') ?? '';
  const charset = contentType.match(/charset=([^;]+)/i)?.[1]?.trim().toLowerCase();
  const encoding = charset === 'tis-620' ? 'windows-874' : charset || 'utf-8';
  try {
    return new TextDecoder(encoding).decode(buffer);
  } catch {
    return new TextDecoder('utf-8').decode(buffer);
  }
}

function toLegacyExamKind(value) {
  if (value === 'midterm') return '1';
  if (value === 'final') return '2';
  return value;
}

function examLocationKey(exam) {
  return [exam.code, exam.section, exam.start, exam.end].join('|');
}

function examReasonKey(exam) {
  return [exam.code, exam.section].join('|');
}

function enrichExamDetails(report, locationReport, reasonReport) {
  const locations = new Map();
  for (const exam of locationReport?.exams ?? []) {
    if (exam.isTba || !exam.location) continue;
    locations.set(examLocationKey(exam), exam.location);
  }

  const reasons = new Map();
  for (const exam of reasonReport?.exams ?? []) {
    if (!exam.isTba) continue;
    const reason = exam.reason || exam.location;
    if (reason) reasons.set(examReasonKey(exam), reason);
  }

  if (!locations.size && !reasons.size) return report;

  return {
    ...report,
    exams: report.exams.map((exam) => ({
      ...exam,
      location: exam.location || locations.get(examLocationKey(exam)) || '',
      reason: exam.reason || (exam.isTba ? reasons.get(examReasonKey(exam)) : undefined),
    })),
  };
}

export class RegistrarClient {
  constructor(fetchImpl = fetch, options = {}) {
    this.fetchImpl = fetchImpl;
    this.enableLegacyLogin = options.enableLegacyLogin ?? fetchImpl === fetch;
    this.enableSemesterProbe = options.enableSemesterProbe ?? fetchImpl === fetch;
    this.cookies = new Map();
    this.semesterRowsCache = new Map();
    this.availableAcademicCache = new Map();
    this.accessToken = '';
    this.userInfo = null;
    this.loggedIn = false;
  }

  clear() {
    this.cookies.clear();
    this.semesterRowsCache.clear();
    this.availableAcademicCache.clear();
    this.accessToken = '';
    this.userInfo = null;
    this.loggedIn = false;
  }

  cookieHeader() {
    return [...this.cookies.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
  }

  storeCookies(headers) {
    for (const cookie of getSetCookie(headers)) {
      const pair = cookie.split(';')[0];
      const index = pair.indexOf('=');
      if (index <= 0) continue;
      this.cookies.set(pair.slice(0, index), pair.slice(index + 1));
    }
  }

  async request(url, options = {}) {
    const headers = new Headers(options.headers ?? {});
    const cookie = this.cookieHeader();
    if (cookie) headers.set('Cookie', cookie);

    const response = await this.fetchImpl(url, {
      ...options,
      headers,
      redirect: 'manual',
    });
    this.storeCookies(response.headers);

    if (response.status >= 300 && response.status < 400 && response.headers.get('location')) {
      const nextUrl = new URL(response.headers.get('location'), url).toString();
      return this.request(nextUrl, { method: 'GET' });
    }

    return response;
  }

  async text(url, options = {}) {
    const response = await this.request(url, options);
    const body = await decodeResponseBody(response);
    return { response, body };
  }

  async rawText(url, options = {}) {
    const headers = new Headers(options.headers ?? {});
    const cookie = this.cookieHeader();
    if (cookie) headers.set('Cookie', cookie);

    const response = await this.fetchImpl(url, {
      ...options,
      headers,
      redirect: 'manual',
    });
    this.storeCookies(response.headers);
    const body = await decodeResponseBody(response);
    return { response, body };
  }

  async apiJson(url, options = {}) {
    const headers = new Headers(options.headers ?? {});
    headers.set('Accept', 'application/json');
    if (this.accessToken) headers.set('Authorization', `Bearer ${this.accessToken}`);

    let body = options.body;
    if (body && typeof body === 'object' && !(body instanceof URLSearchParams)) {
      headers.set('Content-Type', headers.get('Content-Type') ?? 'application/json');
      body = JSON.stringify(body);
    }

    const response = await this.fetchImpl(url, { ...options, headers, body });
    const textBody = await response.text();
    let data = null;
    if (textBody) {
      try {
        data = JSON.parse(textBody);
      } catch {
        data = null;
      }
    }

    return { response, data, body: textBody };
  }

  async getAuthUserInfo(studentId) {
    const url = new URL(USER_API_URL);
    url.searchParams.set('function', 'get-auth-user-info');
    if (studentId) url.searchParams.set('student_id', studentId);

    const { response, data, body } = await this.apiJson(url.toString(), { method: 'GET' });
    if (!response.ok || !data) {
      if (isCredentialRejection(response, data, body)) {
        throw createRegistrarError('Login did not produce an authenticated registrar API session.', 'JWT_INVALID');
      }
      throw createRegistrarError(`Registrar user API returned status ${response.status}.`, 'JWT_UNAVAILABLE');
    }

    return data;
  }

  async getYearSemesterNow(levelId = '1') {
    const url = new URL(REGISTRATION_API_URL);
    url.searchParams.set('function', 'get-year-semester-now');
    url.searchParams.set('level_id', levelId);

    const { response, data } = await this.apiJson(url.toString(), { method: 'GET' });
    if (!response.ok || !data) {
      return {
        YEAR: String(new Date().getFullYear() + 543),
        SEMESTER: '1',
      };
    }
    return data;
  }

  async getRegistrationResult({ year, semester }) {
    const studentId = this.userInfo?.payload?.ticket?.user_id;
    if (!studentId) throw new Error('Registrar user info did not include a student ID.');

    const url = new URL(REGISTRATION_API_URL);
    url.searchParams.set('function', 'get-regis-result');
    url.searchParams.set('student_id', studentId);
    url.searchParams.set('year', year);
    url.searchParams.set('semester', semester);
    url.searchParams.set('level_id', '1');

    const { response, data, body } = await this.apiJson(url.toString(), { method: 'GET' });
    if (isCredentialRejection(response, data, body)) {
      this.loggedIn = false;
      throw new Error('Registrar session expired.');
    }
    if (!response.ok || !Array.isArray(data)) {
      throw new Error(`Registrar registration API returned status ${response.status}.`);
    }

    return data;
  }

  async getRegistrationRowsBySemester(year) {
    if (this.semesterRowsCache.has(year)) return this.semesterRowsCache.get(year);

    const rowsBySemester = new Map();
    await Promise.all(['1', '2', '3'].map(async (semester) => {
      const rows = await this.getRegistrationResult({ year, semester });
      rowsBySemester.set(semester, rows);
    }));
    this.semesterRowsCache.set(year, rowsBySemester);
    return rowsBySemester;
  }

  async getAvailableAcademicRows(currentYear, requestedYear) {
    const cacheKey = `${currentYear}:${requestedYear ?? ''}`;
    if (this.availableAcademicCache.has(cacheKey)) return this.availableAcademicCache.get(cacheKey);

    const rowsByYear = new Map();
    await Promise.all(candidateAcademicYears(currentYear, requestedYear).map(async (year) => {
      rowsByYear.set(year, await this.getRegistrationRowsBySemester(year));
    }));

    const years = [...rowsByYear.entries()]
      .filter(([, rowsBySemester]) => [...rowsBySemester.values()].some((rows) => rows.length > 0))
      .map(([year]) => year);

    const result = { years, rowsByYear };
    this.availableAcademicCache.set(cacheKey, result);
    return result;
  }

  async loginWithJwt(studentId, password) {
    const { response, data, body } = await this.apiJson(USER_API_URL, {
      method: 'POST',
      body: {
        function: 'login-jwt',
        email: toSsoUsername(studentId),
        password,
      },
    });

    if (isCredentialRejection(response, data, body)) {
      throw createRegistrarError('ไม่พบรหัสนักศึกษาหรือรหัสผ่านในระบบ', 'INVALID_LOGIN');
    }

    if (!response.ok) {
      throw createRegistrarError(`Registrar JWT login API returned status ${response.status}.`, 'JWT_UNAVAILABLE');
    }

    const token = extractToken(data);
    if (!token) {
      throw createRegistrarError('Registrar JWT login response did not include a token.', 'JWT_UNAVAILABLE');
    }

    this.accessToken = token;
    this.userInfo = await this.getAuthUserInfo();
    if (this.enableLegacyLogin) {
      await this.createLegacySession(studentId, password).catch(() => undefined);
    }
    this.loggedIn = true;
  }

  async createLegacySession(studentId, password) {
    const authUrl = new URL(KEYCLOAK_AUTH_URL);
    authUrl.searchParams.set('client_id', KEYCLOAK_CLIENT_ID);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('response_mode', 'query');
    authUrl.searchParams.set('redirect_uri', KEYCLOAK_REDIRECT_URI);
    authUrl.searchParams.set('scope', 'openid');

    const start = await this.rawText(authUrl.toString());
    const form = parseForm(start.body);
    if (!form) throw new Error('Keycloak login form was not found.');

    const usernameField = findField(form.fields, USERNAME_FIELDS, /user|email|login/i);
    const passwordField = findField(form.fields, PASSWORD_FIELDS, /pass|pwd/i);
    if (!usernameField || !passwordField) {
      throw new Error('Keycloak login fields were not recognized.');
    }

    form.fields.set(usernameField, toSsoUsername(studentId));
    form.fields.set(passwordField, password);

    const actionUrl = new URL(form.action, authUrl).toString();
    const posted = await this.rawText(actionUrl, {
      method: form.method === 'GET' ? 'GET' : 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams([...form.fields.entries()]),
    });

    const redirect = posted.response.headers.get('location');
    const code = redirect ? new URL(redirect, actionUrl).searchParams.get('code') : '';
    if (!code) throw new Error('Keycloak login did not return an authorization code.');

    const tokenResponse = await this.rawText(KEYCLOAK_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: KEYCLOAK_CLIENT_ID,
        code,
        redirect_uri: KEYCLOAK_REDIRECT_URI,
      }),
    });
    const tokenData = JSON.parse(tokenResponse.body || '{}');
    if (!tokenData.access_token) throw new Error('Keycloak token response did not include an access token.');

    await this.rawText(LEGACY_LOGIN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Origin: 'https://www.reg.kmitl.ac.th',
        Referer: 'https://www.reg.kmitl.ac.th/index/',
      },
      body: new URLSearchParams({ user_id: tokenData.access_token }),
    });

    const legacyInfo = await this.rawText(LEGACY_INFO_URL);
    const info = JSON.parse(legacyInfo.body || '{}');
    if (!info.logged_in) throw new Error('Legacy registrar session was not created.');
  }

  async login(studentId, password) {
    this.clear();

    try {
      await this.loginWithJwt(studentId, password);
      return;
    } catch (error) {
      this.accessToken = '';
      this.userInfo = null;
      if (error?.code === 'INVALID_LOGIN' || error?.code === 'JWT_INVALID') throw error;
    }

    const start = await this.text(LOGIN_URL);
    if (hasAuthenticatedReport(start.body)) {
      this.loggedIn = true;
      return;
    }

    const form = parseForm(start.body);
    if (!form) {
      throw new Error('Registrar login form was not found.');
    }

    const usernameField = findField(form.fields, USERNAME_FIELDS, /user|student|login|uid/i);
    const passwordField = findField(form.fields, PASSWORD_FIELDS, /pass|pwd/i);
    if (!usernameField || !passwordField) {
      throw new Error('Registrar login fields were not recognized.');
    }

    form.fields.set(usernameField, toSsoUsername(studentId));
    form.fields.set(passwordField, password);

    const actionUrl = new URL(form.action || REPORT_URLS.study, REPORT_URLS.study).toString();
    const params = new URLSearchParams([...form.fields.entries()]);
    const loginResult = form.method === 'POST'
      ? await this.text(actionUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params,
        })
      : await this.text(`${actionUrl}?${params.toString()}`);

    if (hasLoginFailure(loginResult.body)) {
      throw new Error('ไม่พบรหัสนักศึกษาหรือรหัสผ่านในระบบ');
    }

    const verify = hasAuthenticatedReport(loginResult.body)
      ? loginResult
      : await this.text(REPORT_URLS.study);

    if (!hasAuthenticatedReport(verify.body)) {
      throw new Error('Login did not produce an authenticated registrar session.');
    }

    this.loggedIn = true;
  }

  async fetchReport(type, options = {}) {
    if (!this.loggedIn) {
      throw new Error('Not logged in.');
    }

    if (this.accessToken && type === 'grade' && options.year && options.semester) {
      return this.fetchLegacyReport(type, options);
    }

    if (this.accessToken) {
      const current = await this.getYearSemesterNow();
      const year = options.year || current.YEAR;
      const semester = options.semester || current.SEMESTER;
      let effectiveYear = year;
      let effectiveSemester = semester;
      let registrationRows = null;
      let availableSemesters;
      let availableYears;

      if (this.enableSemesterProbe) {
        const academicRows = await this.getAvailableAcademicRows(current.YEAR, year);
        availableYears = academicRows.years;
        if (availableYears.length && !availableYears.includes(effectiveYear)) {
          effectiveYear = availableYears[0];
        }

        const rowsBySemester = academicRows.rowsByYear.get(effectiveYear) ?? new Map();
        availableSemesters = [...rowsBySemester.entries()]
          .filter(([, rows]) => rows.length > 0)
          .map(([value]) => value)
          .sort((a, b) => Number(b) - Number(a));
        if (!availableSemesters.length) availableSemesters = [effectiveSemester];
        if (!options.semester) {
          effectiveSemester = availableSemesters[0];
        } else if (!availableSemesters.includes(effectiveSemester)) {
          effectiveSemester = availableSemesters[0];
        }
        registrationRows = rowsBySemester.get(effectiveSemester) ?? [];
      } else {
        registrationRows = await this.getRegistrationResult({ year: effectiveYear, semester: effectiveSemester });
      }

      const academicOptions = buildAcademicOptions(effectiveYear, effectiveSemester, {
        currentYear: current.YEAR,
        years: availableYears,
        semesters: availableSemesters,
      });

      if (type === 'grade') {
        const gradeReport = await this.fetchLegacyReport(type, {
          year: effectiveYear,
          semester: effectiveSemester,
        });
        return {
          ...gradeReport,
          options: {
            years: academicOptions.years,
            semesters: academicOptions.semesters,
          },
        };
      }

      if (type === 'study') {
        const legacyReport = await this.fetchLegacyReport(type, {
          year: effectiveYear,
          semester: effectiveSemester,
        }).catch(() => null);
        if (legacyReport?.courses?.length) {
          return {
            ...legacyReport,
            options: {
              years: academicOptions.years,
              semesters: academicOptions.semesters,
            },
          };
        }

        return {
          ...mapRegistrationStudyReport(registrationRows, {
            userInfo: this.userInfo,
            year: effectiveYear,
            semester: effectiveSemester,
          }),
          options: {
            years: academicOptions.years,
            semesters: academicOptions.semesters,
          },
        };
      }

      if (type === 'exam') {
        const examKind = options.examKind || 'final';
        const registrationReport = mapRegistrationExamReport(registrationRows, {
          userInfo: this.userInfo,
          year: effectiveYear,
          semester: effectiveSemester,
          examKind,
        });
        const legacyReport = await this.fetchLegacyReport(type, {
          year: effectiveYear,
          semester: effectiveSemester,
          examKind,
        }).catch(() => null);
        if (legacyReport?.exams?.length) {
          const legacyScheduledCount = legacyReport.exams.filter((exam) => !exam.isTba).length;
          const registrationScheduledCount = registrationReport.exams.filter((exam) => !exam.isTba).length;
          if (!legacyScheduledCount && registrationScheduledCount) {
            const seatReport = await this.fetchLegacyReport(type, {
              year: effectiveYear,
              semester: effectiveSemester,
            }).catch(() => null);
            const enrichedRegistrationReport = enrichExamDetails(registrationReport, seatReport, legacyReport);
            return {
              ...enrichedRegistrationReport,
              student: {
                ...enrichedRegistrationReport.student,
                ...legacyReport.student,
                semester: enrichedRegistrationReport.student.semester || legacyReport.student.semester,
              },
              options: {
                years: academicOptions.years,
                semesters: academicOptions.semesters,
                examKinds: academicOptions.examKinds.map((option) => ({
                  ...option,
                  selected: option.value === examKind,
                })),
              },
            };
          }

          return {
            ...legacyReport,
            options: {
              years: academicOptions.years,
              semesters: academicOptions.semesters,
              examKinds: academicOptions.examKinds.map((option) => ({
                ...option,
                selected: option.value === examKind,
              })),
            },
          };
        }

        return {
          ...registrationReport,
          options: {
            years: academicOptions.years,
            semesters: academicOptions.semesters,
            examKinds: academicOptions.examKinds.map((option) => ({
              ...option,
              selected: option.value === examKind,
            })),
          },
        };
      }
      throw new Error(`Unknown report type: ${type}`);
    }

    return this.fetchLegacyReport(type, options);
  }

  async fetchLegacyReport(type, options = {}) {
    const baseUrl = REPORT_URLS[type];
    if (!baseUrl) throw new Error(`Unknown report type: ${type}`);

    const url = new URL(baseUrl);
    if (options.semester) url.searchParams.set('semester', options.semester);
    if (options.year) url.searchParams.set('year', options.year);
    if (options.examKind) url.searchParams.set('mid_or_final', toLegacyExamKind(options.examKind));

    const { body } = await this.text(url.toString());
    if (!hasAuthenticatedReport(body)) {
      if (this.accessToken) {
        throw new Error('Registrar report pages did not accept the current token login.');
      }
      this.loggedIn = false;
      throw new Error('Registrar session expired.');
    }

    if (type === 'study') {
      return {
        type,
        ...parseStudyReport(body),
        options: {
          semesters: parseSelectionOptions(body, 'semester'),
          years: parseSelectionOptions(body, 'year'),
        },
      };
    }

    if (type === 'exam') {
      return {
        type,
        ...parseExamReport(body),
        options: {
          semesters: parseSelectionOptions(body, 'semester'),
          years: parseSelectionOptions(body, 'year'),
          examKinds: parseSelectionOptions(body, 'mid_or_final'),
        },
      };
    }

    const gradeReport = parseGradeReport(body);
    if (!gradeReport.student.semester && options.semester && options.year) {
      gradeReport.student.semester = `${options.semester}/${options.year}`;
    }

    return {
      type,
      ...gradeReport,
      options: {
        semesters: parseSelectionOptions(body, 'semester'),
        years: parseSelectionOptions(body, 'year'),
      },
    };
  }
}
