import { describe, expect, it } from 'vitest';
import { RegistrarClient } from './client.js';

const publicIndexHtml = `
<form action="search_news.php" method="post">
  <input type="text" name="keyword_search" id="keyword_search1">
  <input name="sarch_group" type="hidden" value="2">
  <button type="submit">Search</button>
</form>`;

const ssoLoginHtml = `
<form action="https://sso.reg.kmitl.ac.th/realms/registrar/login-actions/authenticate?session_code=abc&amp;execution=def&amp;client_id=KMITL-client" method="post">
  <input type="text" id="username" name="username" value="">
  <input id="password" name="password" type="password">
  <input type="hidden" id="id-hidden-input" name="credentialId" />
  <input name="login" type="submit" value="LOGIN">
</form>`;

const authenticatedStudyHtml = `
<table>
  <tr><td>รหัสวิชา</td><td>วัน-เวลาเรียน</td></tr>
</table>`;

const gradeHtml = `
<table>
  <tr><td colspan="14">ID: 67010388 Name: NOVA TEST Semester/Year: 1/2568</td></tr>
  <tr>
    <td>No.</td><td></td><td>Course No.</td><td></td><td>Course Title</td><td></td><td>Section</td><td></td><td>Credit</td><td></td><td>Type</td><td></td><td>Grade</td><td></td>
  </tr>
  <tr>
    <td>1</td><td></td><td>01006012</td><td></td><td>WEB APPLICATION DEVELOPMENT</td><td></td><td>1</td><td></td><td>3</td><td></td><td>Lecture</td><td></td><td>A</td><td></td>
  </tr>
  <tr>
    <td>Cumulation</td><td></td><td>3</td><td></td><td>3</td><td></td><td>3</td><td></td><td>12</td><td></td><td>4.00</td><td></td><td>Pass</td><td></td>
  </tr>
</table>`;

const ENGINEERING_FACULTY_TH = '\u0e04\u0e13\u0e30\u0e27\u0e34\u0e28\u0e27\u0e01\u0e23\u0e23\u0e21\u0e28\u0e32\u0e2a\u0e15\u0e23\u0e4c';
const EE_MAJOR_TH = '\u0e2a\u0e32\u0e02\u0e32\u0e27\u0e34\u0e0a\u0e32 \u0e27\u0e34\u0e28\u0e27\u0e01\u0e23\u0e23\u0e21\u0e44\u0e1f\u0e1f\u0e49\u0e32';

const studentProfileHtml = `
<table>
  <tr><td>คณะ</td><td>วิศวกรรมศาสตร์</td></tr>
  <tr><td>ภาควิชา</td><td>วิศวกรรมไฟฟ้า</td></tr>
  <tr><td>สาขาวิชา</td><td>วิศวกรรมไฟฟ้า</td></tr>
</table>`;

function htmlResponse(html, init = {}) {
  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', ...(init.headers ?? {}) },
    ...init,
  });
}

describe('RegistrarClient login', () => {
  it('uses the current registrar JWT login API before trying legacy SSO', async () => {
    const calls = [];
    const client = new RegistrarClient(async (url, options = {}) => {
      calls.push({ url: String(url), options });

      if (String(url) === 'https://api.reg.kmitl.ac.th/user/' && options.method === 'POST') {
        expect(options.headers.get('Content-Type')).toBe('application/json');
        expect(JSON.parse(String(options.body))).toEqual({
          function: 'login-jwt',
          email: '66010001@kmitl.ac.th',
          password: 'secret',
        });
        return new Response(JSON.stringify({ token: 'jwt-token' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (String(url).startsWith('https://api.reg.kmitl.ac.th/user/?')) {
        expect(options.headers.get('Authorization')).toBe('Bearer jwt-token');
        expect(String(url)).toContain('function=get-auth-user-info');
        return new Response(JSON.stringify({ payload: { ticket: { user_id: '66010001' } } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    await client.login('66010001', 'secret');

    expect(client.loggedIn).toBe(true);
    expect(calls.map((call) => call.url)).toEqual([
      'https://api.reg.kmitl.ac.th/user/',
      'https://api.reg.kmitl.ac.th/user/?function=get-auth-user-info',
    ]);
  });

  it('reports rejected credentials from the current registrar JWT login API', async () => {
    const client = new RegistrarClient(async (url) => {
      if (String(url) === 'https://api.reg.kmitl.ac.th/user/') {
        return new Response(JSON.stringify({ message: 'incorrect username or password' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    await expect(client.login('66010001', 'secret')).rejects.toThrow(
      'ไม่พบรหัสนักศึกษาหรือรหัสผ่านในระบบ',
    );
    expect(client.loggedIn).toBe(false);
  });

  it('uses the registrar user login page instead of the public report redirect search form', async () => {
    const calls = [];
    const client = new RegistrarClient(async (url, options = {}) => {
      calls.push({ url: String(url), options });

      if (String(url) === 'https://api.reg.kmitl.ac.th/user/') {
        throw new TypeError('JWT endpoint unavailable');
      }

      if (String(url).includes('/u_student/report_studytable_show.php')) {
        return htmlResponse(publicIndexHtml);
      }

      if (String(url).includes('/user/')) {
        return htmlResponse(ssoLoginHtml);
      }

      if (String(url).includes('/login-actions/authenticate')) {
        const body = String(options.body);
        expect(body).toContain('username=66010001%40kmitl.ac.th');
        expect(body).toContain('password=secret');
        expect(String(url)).toContain('&execution=def&');
        return htmlResponse(authenticatedStudyHtml);
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    await client.login('66010001', 'secret');

    expect(client.loggedIn).toBe(true);
    expect(calls.map((call) => call.url)).toEqual([
      'https://api.reg.kmitl.ac.th/user/',
      'https://www.reg.kmitl.ac.th/user/',
      'https://sso.reg.kmitl.ac.th/realms/registrar/login-actions/authenticate?session_code=abc&execution=def&client_id=KMITL-client',
    ]);
  });

  it('does not append the KMITL email domain when the username already contains a domain', async () => {
    const client = new RegistrarClient(async (url, options = {}) => {
      if (String(url) === 'https://api.reg.kmitl.ac.th/user/') {
        throw new TypeError('JWT endpoint unavailable');
      }

      if (String(url).includes('/user/')) {
        return htmlResponse(ssoLoginHtml);
      }

      if (String(url).includes('/login-actions/authenticate')) {
        const body = String(options.body);
        expect(body).toContain('username=student%40example.test');
        return htmlResponse(authenticatedStudyHtml);
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    await client.login('student@example.test', 'secret');

    expect(client.loggedIn).toBe(true);
  });
});

describe('RegistrarClient reports', () => {
  it('creates the legacy PHP session during JWT login so grade reports can load', async () => {
    const calls = [];
    const client = new RegistrarClient(async (url, options = {}) => {
      const requestUrl = String(url);
      calls.push({ url: requestUrl, options });

      if (requestUrl === 'https://api.reg.kmitl.ac.th/user/' && options.method === 'POST') {
        return new Response(JSON.stringify({ token: 'jwt-token' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (requestUrl.startsWith('https://api.reg.kmitl.ac.th/user/?')) {
        return new Response(JSON.stringify({
          payload: { ticket: { user_id: '67010388' } },
          fname_en: 'NOVA',
          lname_en: 'TEST',
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (requestUrl.startsWith('https://sso.reg.kmitl.ac.th/realms/registrar/protocol/openid-connect/auth')) {
        expect(requestUrl).toContain('client_id=KMITL-client');
        return htmlResponse(ssoLoginHtml, {
          headers: { 'Set-Cookie': 'AUTH_SESSION_ID=sso-session; Path=/realms/registrar' },
        });
      }

      if (requestUrl.includes('/login-actions/authenticate')) {
        const body = String(options.body);
        expect(body).toContain('username=67010388%40kmitl.ac.th');
        expect(body).toContain('password=secret');
        expect(options.headers.get('Cookie')).toContain('AUTH_SESSION_ID=sso-session');
        return new Response('', {
          status: 302,
          headers: { Location: 'https://regis.reg.kmitl.ac.th/?code=auth-code' },
        });
      }

      if (requestUrl === 'https://sso.reg.kmitl.ac.th/realms/registrar/protocol/openid-connect/token') {
        const body = String(options.body);
        expect(body).toContain('grant_type=authorization_code');
        expect(body).toContain('code=auth-code');
        return new Response(JSON.stringify({ access_token: 'keycloak-token' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (requestUrl === 'https://www.reg.kmitl.ac.th/user/login.php') {
        expect(String(options.body)).toBe('user_id=keycloak-token');
        return new Response('', {
          status: 302,
          headers: { 'Set-Cookie': 'PHPSESSID=legacy-session; Path=/' },
        });
      }

      if (requestUrl === 'https://www.reg.kmitl.ac.th/index/index_api.php?function=get-info') {
        expect(options.headers.get('Cookie')).toContain('PHPSESSID=legacy-session');
        return new Response(JSON.stringify({ logged_in: true, user_id: '67010388' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (requestUrl === 'https://www.reg.kmitl.ac.th/u_officer/student.php?close_header=1') {
        expect(options.headers.get('Cookie')).toContain('PHPSESSID=legacy-session');
        return htmlResponse(studentProfileHtml);
      }

      if (requestUrl === 'https://www.reg.kmitl.ac.th/u_student/report_gradetable_show.php?semester=1&year=2568') {
        expect(options.headers.get('Cookie')).toContain('PHPSESSID=legacy-session');
        return htmlResponse(gradeHtml);
      }

      throw new Error(`Unexpected URL: ${url}`);
    }, { enableLegacyLogin: true });

    await client.login('67010388', 'secret');
    const report = await client.fetchReport('grade', { year: '2568', semester: '1' });

    expect(client.loggedIn).toBe(true);
    expect(report).toMatchObject({
      type: 'grade',
      student: {
        id: '67010388',
        semester: '1/2568',
        faculty: ENGINEERING_FACULTY_TH,
        department: EE_MAJOR_TH,
      },
      courses: [expect.objectContaining({ code: '01006012', grade: 'A' })],
      summary: [expect.objectContaining({ title: 'Cumulation', gpa: '4.00' })],
    });
    expect(calls.some((call) => call.url.includes('report_gradetable_show.php'))).toBe(true);
  });

  it('loads study reports from the current registrar API for JWT sessions', async () => {
    const client = new RegistrarClient(async (url, options = {}) => {
      if (String(url).includes('get-year-semester-now')) {
        expect(options.headers.get('Authorization')).toBe('Bearer jwt-token');
        return new Response(JSON.stringify({ YEAR: '2568', SEMESTER: '1' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (String(url).includes('get-regis-result')) {
        expect(String(url)).toContain('student_id=67010388');
        expect(String(url)).toContain('year=2568');
        expect(String(url)).toContain('semester=1');
        return new Response(JSON.stringify([
          {
            subject_id: '01006051',
            section: '2',
            lect_or_prac: 'ท',
            teach_day: '2',
            teach_time: '13:00:00',
            teach_time2: '15:00:00',
            teachtime_str: '',
            subject_ename: 'DRAWING',
            credit: '3',
            lect_hr: '2',
            prac_hr: '2',
            self_hr: '5',
          },
        ]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (String(url) === 'https://www.reg.kmitl.ac.th/u_officer/student.php?close_header=1') {
        return htmlResponse(studentProfileHtml);
      }

      throw new Error(`Unexpected URL: ${url}`);
    });
    client.loggedIn = true;
    client.accessToken = 'jwt-token';
    client.userInfo = {
      payload: { ticket: { user_id: '67010388' } },
      fname_en: 'NOVA',
      lname_en: 'TEST',
    };

    const report = await client.fetchReport('study');

    expect(report).toMatchObject({
      type: 'study',
      student: {
        id: '67010388',
        semester: '1/2568',
        faculty: ENGINEERING_FACULTY_TH,
        department: EE_MAJOR_TH,
      },
      courses: [
        {
          code: '01006051',
          slots: [expect.objectContaining({ day: 'Mon', start: '13:00', end: '15:00' })],
        },
      ],
    });
  });

  it('filters empty registration semesters from JWT report options and falls back to an available semester', async () => {
    const client = new RegistrarClient(async (url) => {
      const requestUrl = String(url);
      if (requestUrl.includes('get-year-semester-now')) {
        return new Response(JSON.stringify({ YEAR: '2568', SEMESTER: '1' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (requestUrl.includes('get-regis-result')) {
        const parsed = new URL(requestUrl);
        const year = parsed.searchParams.get('year');
        const semester = parsed.searchParams.get('semester');
        const rows = year !== '2568' || semester === '3'
          ? []
          : [
              {
                subject_id: `0100605${semester}`,
                section: '2',
                lect_or_prac: 'à¸—',
                teach_day: '2',
                teach_time: '13:00:00',
                teach_time2: '15:00:00',
                teachtime_str: '',
                subject_ename: `SEMESTER ${semester} COURSE`,
                credit: '3',
              },
            ];
        return new Response(JSON.stringify(rows), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      throw new Error(`Unexpected URL: ${url}`);
    }, { enableSemesterProbe: true });
    client.loggedIn = true;
    client.accessToken = 'jwt-token';
    client.userInfo = { payload: { ticket: { user_id: '67010388' } } };

    const report = await client.fetchReport('study', { year: '2568', semester: '3' });

    expect(report.student.semester).toBe('2/2568');
    expect(report.options.semesters).toEqual([
      { value: '2', label: '2', selected: true },
      { value: '1', label: '1', selected: false },
    ]);
    expect(report.options.years).toEqual([
      { value: '2568', label: '2568', selected: true },
    ]);
    expect(report.courses[0].name).toBe('SEMESTER 2 COURSE');
  });

  it('filters empty registration years from JWT report options and falls back to an available year', async () => {
    const client = new RegistrarClient(async (url) => {
      const requestUrl = String(url);
      if (requestUrl.includes('get-year-semester-now')) {
        return new Response(JSON.stringify({ YEAR: '2568', SEMESTER: '1' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (requestUrl.includes('get-regis-result')) {
        const parsed = new URL(requestUrl);
        const year = parsed.searchParams.get('year');
        const semester = parsed.searchParams.get('semester');
        const hasRows = (year === '2568' && semester === '1') || (year === '2567' && semester === '2');
        const rows = hasRows
          ? [
              {
                subject_id: `${year}${semester}`,
                section: '2',
                lect_or_prac: 'à¸—',
                teach_day: '2',
                teach_time: '13:00:00',
                teach_time2: '15:00:00',
                teachtime_str: '',
                subject_ename: `${year}/${semester} COURSE`,
                credit: '3',
              },
            ]
          : [];
        return new Response(JSON.stringify(rows), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      throw new Error(`Unexpected URL: ${url}`);
    }, { enableSemesterProbe: true });
    client.loggedIn = true;
    client.accessToken = 'jwt-token';
    client.userInfo = { payload: { ticket: { user_id: '67010388' } } };

    const report = await client.fetchReport('study', { year: '2566', semester: '1' });

    expect(report.student.semester).toBe('1/2568');
    expect(report.options.years).toEqual([
      { value: '2568', label: '2568', selected: true },
      { value: '2567', label: '2567', selected: false },
    ]);
    expect(report.options.semesters).toEqual([
      { value: '1', label: '1', selected: true },
    ]);
    expect(report.courses[0].name).toBe('2568/1 COURSE');
  });

  it('keeps available years sorted high to low even when probes finish out of order', async () => {
    const client = new RegistrarClient(async (url) => {
      const requestUrl = String(url);
      if (requestUrl.includes('get-year-semester-now')) {
        return new Response(JSON.stringify({ YEAR: '2568', SEMESTER: '1' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (requestUrl.includes('get-regis-result')) {
        const parsed = new URL(requestUrl);
        const year = parsed.searchParams.get('year');
        const semester = parsed.searchParams.get('semester');
        const rows = semester === '1' && (year === '2568' || year === '2567')
          ? [
              {
                subject_id: `${year}${semester}`,
                section: '2',
                lect_or_prac: 'Lecture',
                teach_day: '2',
                teach_time: '13:00:00',
                teach_time2: '15:00:00',
                teachtime_str: '',
                subject_ename: `${year}/${semester} COURSE`,
                credit: '3',
              },
            ]
          : [];
        if (year === '2568') {
          await new Promise((resolve) => setTimeout(resolve, 5));
        }
        return new Response(JSON.stringify(rows), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      throw new Error(`Unexpected URL: ${url}`);
    }, { enableSemesterProbe: true });
    client.loggedIn = true;
    client.accessToken = 'jwt-token';
    client.userInfo = { payload: { ticket: { user_id: '67010388' } } };

    const report = await client.fetchReport('study', { year: '2500' });

    expect(report.student.semester).toBe('1/2568');
    expect(report.options.years.map((option) => option.value)).toEqual(['2568', '2567']);
  });

  it('loads grade reports from the fallback available semester when the requested semester is empty', async () => {
    const client = new RegistrarClient(async (url) => {
      const requestUrl = String(url);
      if (requestUrl.includes('get-year-semester-now')) {
        return new Response(JSON.stringify({ YEAR: '2568', SEMESTER: '1' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (requestUrl.includes('get-regis-result')) {
        const parsed = new URL(requestUrl);
        const year = parsed.searchParams.get('year');
        const semester = parsed.searchParams.get('semester');
        const rows = year === '2568' && semester === '2'
          ? [
              {
                subject_id: '01006052',
                section: '2',
                lect_or_prac: 'Lecture',
                teach_day: '2',
                teach_time: '13:00:00',
                teach_time2: '15:00:00',
                teachtime_str: '',
                subject_ename: 'SEMESTER 2 COURSE',
                credit: '3',
              },
            ]
          : [];
        return new Response(JSON.stringify(rows), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (requestUrl === 'https://www.reg.kmitl.ac.th/u_student/report_gradetable_show.php?semester=2&year=2568') {
        return htmlResponse(gradeHtml.replace('1/2568', '2/2568'));
      }

      throw new Error(`Unexpected URL: ${url}`);
    }, { enableSemesterProbe: true });
    client.loggedIn = true;
    client.accessToken = 'jwt-token';
    client.userInfo = { payload: { ticket: { user_id: '67010388' } } };

    const report = await client.fetchReport('grade', { year: '2568', semester: '3' });

    expect(report.student.semester).toBe('2/2568');
    expect(report.options.semesters).toEqual([
      { value: '2', label: '2', selected: true },
    ]);
  });

  it('blanks faculty and major when the raw student profile is unavailable', async () => {
    const mismatchedGradeHtml = `
      <table>
        <tr><td colspan="7">Faculty of Information Technology</td></tr>
        <tr><td colspan="7">ID: 65080000 Name: FRIEND ACCOUNT</td></tr>
        <tr><td colspan="7">Department: --> Major: Bachelor of Science Programme in Food Process Engineering Semester/Year : 1/2568</td></tr>
        <tr><td>No.</td><td>Course No.</td><td>Course Title</td><td>Section</td><td>Credit</td><td>Type</td><td>Grade</td></tr>
        <tr><td>1</td><td>01006012</td><td>TEST COURSE</td><td>1</td><td>3</td><td>Lecture</td><td>A</td></tr>
      </table>`;
    const client = new RegistrarClient(async (url) => {
      const requestUrl = String(url);
      if (requestUrl === 'https://www.reg.kmitl.ac.th/u_student/report_gradetable_show.php?semester=1&year=2568') {
        return htmlResponse(mismatchedGradeHtml);
      }

      throw new Error(`Unexpected URL: ${url}`);
    }, { enableSemesterProbe: false });
    client.loggedIn = true;
    client.accessToken = 'jwt-token';
    client.userInfo = {
      payload: { ticket: { user_id: '65080000' } },
      faculty_id: '06',
    };

    const report = await client.fetchReport('grade', { year: '2568', semester: '1' });

    expect(report.student).toMatchObject({
      id: '65080000',
      faculty: '',
      department: '',
    });
  });

  it('loads exam reports from the current registrar API for JWT sessions', async () => {
    const client = new RegistrarClient(async (url) => {
      if (String(url).includes('get-year-semester-now')) {
        return new Response(JSON.stringify({ YEAR: '2568', SEMESTER: '1' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (String(url).includes('get-regis-result')) {
        return new Response(JSON.stringify([
          {
            subject_id: '01006051',
            section: '2',
            lect_or_prac: 'ท',
            exam_date: '2025-10-22',
            exam_time: '09:30:00',
            exam_time2: '12:30:00',
            subject_ename: 'DRAWING',
          },
        ]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (String(url) === 'https://www.reg.kmitl.ac.th/u_officer/student.php?close_header=1') {
        return htmlResponse(studentProfileHtml);
      }

      throw new Error(`Unexpected URL: ${url}`);
    });
    client.loggedIn = true;
    client.accessToken = 'jwt-token';
    client.userInfo = {
      payload: { ticket: { user_id: '67010388' } },
      faculty_id: '07',
    };

    const report = await client.fetchReport('exam', { examKind: 'final' });

    expect(report).toMatchObject({
      type: 'exam',
      student: {
        id: '67010388',
        semester: '1/2568',
        faculty: ENGINEERING_FACULTY_TH,
        department: EE_MAJOR_TH,
      },
      exams: [expect.objectContaining({ code: '01006051', dateRaw: '2025-10-22' })],
    });
  });

  it('uses the registration API schedule when legacy exam rows only have generic final-exam locations', async () => {
    const legacyGenericExamHtml = `
      <table>
        <tr><td colspan="9">Faculty of Information Technology</td></tr>
        <tr><td colspan="9">Department: --> Major: Bachelor of Science Program in Food Process Engineering Semester/Year : 2/2568</td></tr>
        <tr><td>รหัสวิชา</td><td>เวลาสอบ</td></tr>
        <tr><td>ลำดับที่</td><td>รหัสวิชา</td><td>รายวิชา</td><td>กลุ่ม</td><td>หน่วยกิต</td><td>ทฤษฎี/ปฏิบัติ</td><td>วัน-เดือน-ปี ที่สอบ</td><td>เวลาสอบ</td><td>อาคาร-ห้อง-ที่นั่งสอบ</td></tr>
        <tr><td>1</td><td>01026216</td><td>PROBABILITY AND STATISTICS FOR ENGINEERING</td><td>2</td><td>3 (3-0)</td><td>ทฤษฎี</td><td>จ. 16 มี.ค. 26</td><td>09:30-12:30 น.</td><td>สอบในช่วงสอบปลายภาค (ในห้องสอบ)<br>Examination during the final exam (in the examination room)</td></tr>
        <tr><td>2</td><td>90641005</td><td>TEAM-PROJECT 2</td><td>101</td><td>1 (0-2)</td><td>ปฏิบัติ</td><td>จัดสอบเอง</td></tr>
      </table>`;
    const legacySeatExamHtml = `
      <table>
        <tr><td colspan="9">Faculty of Information Technology</td></tr>
        <tr><td colspan="9">Department: --> Major: Bachelor of Science Program in Food Process Engineering Semester/Year : 2/2568</td></tr>
        <tr><td>รหัสวิชา</td><td>เวลาสอบ</td></tr>
        <tr><td>ลำดับที่</td><td>รหัสวิชา</td><td>รายวิชา</td><td>กลุ่ม</td><td>หน่วยกิต</td><td>ทฤษฎี/ปฏิบัติ</td><td>วัน-เดือน-ปี ที่สอบ</td><td>เวลาสอบ</td><td>อาคาร-ห้อง-ที่นั่งสอบ</td></tr>
        <tr><td>1</td><td>01026216</td><td>PROBABILITY AND STATISTICS FOR ENGINEERING</td><td>2</td><td>3 (3-0)</td><td>ทฤษฎี</td><td>จ. 16 มี.ค. 26</td><td>09:30-12:30 น.</td><td><a href="report_examtable_seat.php?data=x">อาคาร 12 ชั้น:E12-505:F2</a></td></tr>
        <tr><td>2</td><td>90641005</td><td>TEAM-PROJECT 2</td><td>101</td><td>1 (0-2)</td><td>ปฏิบัติ</td><td>จัดสอบเอง</td></tr>
      </table>`;
    const client = new RegistrarClient(async (url) => {
      const requestUrl = String(url);
      if (requestUrl.includes('get-year-semester-now')) {
        return new Response(JSON.stringify({ YEAR: '2568', SEMESTER: '2' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (requestUrl.includes('get-regis-result')) {
        return new Response(JSON.stringify([
          {
            subject_id: '01026216',
            section: '2',
            lect_or_prac: 'ท',
            mexam_date: '2026-01-19',
            mexam_time: '09:30:00',
            mexam_time2: '12:30:00',
            exam_date: '2026-03-16',
            exam_time: '09:30:00',
            exam_time2: '12:30:00',
            subject_ename: 'PROBABILITY AND STATISTICS FOR ENGINEERING',
          },
          {
            subject_id: '90641005',
            section: '101',
            lect_or_prac: 'ป',
            mexam_date: '0000-00-00',
            mexam_time: '00:00:00',
            mexam_time2: '00:00:00',
            exam_date: '0000-00-00',
            exam_time: '00:00:00',
            exam_time2: '00:00:00',
            subject_ename: 'TEAM-PROJECT 2',
          },
        ]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (requestUrl.includes('report_examtable_show.php')) {
        if (requestUrl.includes('mid_or_final=final') || requestUrl.includes('mid_or_final=2') || requestUrl.includes('mid_or_final=midterm') || requestUrl.includes('mid_or_final=1')) {
          return htmlResponse(legacyGenericExamHtml);
        }
        return htmlResponse(legacySeatExamHtml);
      }

      throw new Error(`Unexpected URL: ${url}`);
    });
    client.loggedIn = true;
    client.accessToken = 'jwt-token';
    client.userInfo = {
      payload: { ticket: { user_id: '67010388' } },
      faculty_id: '07',
    };

    const finalReport = await client.fetchReport('exam', { year: '2568', semester: '2', examKind: 'final' });
    const midtermReport = await client.fetchReport('exam', { year: '2568', semester: '2', examKind: 'midterm' });

    expect(finalReport.exams).toEqual([
      expect.objectContaining({
        code: '01026216',
        name: 'PROBABILITY AND STATISTICS FOR ENGINEERING',
        dateRaw: '2026-03-16',
        start: '09:30',
        end: '12:30',
        location: 'E12-505 (F2)',
        isTba: false,
      }),
      expect.objectContaining({
        code: '90641005',
        name: 'TEAM-PROJECT 2',
        type: 'ปฏิบัติ',
        reason: 'จัดสอบเอง',
        isTba: true,
      }),
    ]);
    expect(finalReport.student).toMatchObject({
      faculty: '',
      department: '',
    });
    expect(midtermReport.exams).toEqual([
      expect.objectContaining({
        code: '01026216',
        dateRaw: '2026-01-19',
        location: 'E12-505 (F2)',
        type: 'ทฤษฎี',
        isTba: false,
      }),
      expect.objectContaining({
        code: '90641005',
        type: 'ปฏิบัติ',
        reason: 'จัดสอบเอง',
        isTba: true,
      }),
    ]);
  });

  it('keeps the JWT session when the registration API has a non-auth report error', async () => {
    const client = new RegistrarClient(async (url) => {
      if (String(url).includes('get-year-semester-now')) {
        return new Response(JSON.stringify({ YEAR: '2568', SEMESTER: '1' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (String(url).includes('get-regis-result')) {
        return new Response(JSON.stringify({ message: 'temporary failure' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      throw new Error(`Unexpected URL: ${url}`);
    });
    client.loggedIn = true;
    client.accessToken = 'jwt-token';
    client.userInfo = { payload: { ticket: { user_id: '67010388' } } };

    await expect(client.fetchReport('study')).rejects.toThrow('Registrar registration API returned status 500.');
    expect(client.loggedIn).toBe(true);
  });
});
