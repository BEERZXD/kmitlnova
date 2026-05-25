# KMITL Nova

## Purpose
KMITL Nova is a standalone webapp for viewing KMITL registrar data with a modern interface. It supports local development and hosted Vercel deployment.

The app currently supports:
- Study timetable.
- Exam timetable, with final and midterm selection.
- Grade result.
- Image export for the rendered report.

This project is related to `D:\Project\kmitlpromax`, the Chrome extension that modernizes the official registrar pages. KMITL Nova reuses the same presentation goals and many behavior rules, but it is a standalone React app with a local Node backend.

## Current Product Decisions
- This is a real live app, not a mockup.
- Credentials and registrar sessions are handled by the backend process.
- Credentials, cookies, and registrar JWT tokens must stay in process memory only.
- No student ID, password, registrar cookie, JWT, or registrar session data should be stored in files, browser local storage, browser session storage, or persistent databases.
- Hosted sessions are isolated per browser through an opaque `HttpOnly`, `SameSite=Lax` session cookie. The cookie stores only a random session ID; registrar state stays in backend memory and expires after 30 minutes of inactivity.
- The app loads only the selected report first. Other reports load when the user switches tabs.
- The authenticated action bar intentionally has no manual refresh button. Changing tab, semester, year, or exam kind loads the selected report; browser reload remains available for a full app restart.
- Academic year and semester selectors should show only years/semesters where the student has data.
- Semester 3 must not appear if the student has no semester 3 registration rows.
- Changing academic year clears the currently selected semester before loading, so stale semesters from the previous year cannot remain selected while new options are loading.
- Switching report pages must not reuse a stale selected year or semester from another page when the newly loaded report provides its own selected options.
- Image export is image-only and captures the report surface, not the entire app shell. Exports temporarily force the report surface into the desktop report layout so mobile/iPad users still download a desktop-style image.
- Mobile and iPad layouts keep dense timetable and grade report structures intact, using controlled horizontal scrolling on the timetable grid or table surface only. Study timetable grids intentionally use a wider mobile/tablet canvas and taller rows so short one-hour subject cards remain readable instead of being compressed. Report title cards and TBA sections stay in the normal page flow, and timetable scroll surfaces avoid reserved scrollbar gutters so grid borders align with the title card.
- Exam timetable grid rows use auto sizing (not 1fr) and no min-height so date rows stay compact on mobile instead of inflating to fill the grid.

## Tech Stack
- Frontend: React 19, Vite, TypeScript, CSS.
- Backend: Node.js HTTP/serverless handlers using native `http`, native `fetch`, and per-session in-memory state.
- Dev process: `concurrently` runs backend and Vite together.
- Testing: Vitest.
- Image export: `html-to-image` with JPG output.
- Icons: `lucide-react`.
- Module system: ESM (`"type": "module"`).

## NPM Scripts
- `npm run dev`: starts `node server/index.js` and `vite --host 127.0.0.1`.
- `npm run dev:lan`: starts backend and Vite on `0.0.0.0` for testing from phones/tablets on the same local network.
- `npm run build`: builds the Vite frontend into `dist/`.
- `npm run preview`: runs only the Node backend, which can serve `dist/` if it exists.
- `npm run preview:lan`: runs the built/preview backend on `0.0.0.0` for local-network testing.
- `npm test`: runs the Vitest suite.

## Local And Hosted Runtime
- Backend default URL: `http://127.0.0.1:8787`.
- Frontend dev URL: `http://127.0.0.1:5173`.
- Vite proxies `/api` to `http://127.0.0.1:8787`.
- The backend binds to `127.0.0.1`, not a public interface.
- For same-Wi-Fi phone/tablet testing, use `npm run dev:lan` and open `http://<computer-lan-ip>:5173`. This keeps the default dev command local-only while making LAN access explicit.
- In production/preview mode, `server/index.js` serves files from `dist/`.
- If `dist/` does not exist, the backend returns a JSON message saying to start Vite or build the frontend.
- On Vercel, `/api/:path*` explicitly rewrites to `api/[...path].js` and all non-API routes rewrite to the built SPA `index.html`.
- Vercel serverless functions deploy to Singapore (`sin1`) region for low latency to KMITL registrar servers in Thailand.

## Main Files
- `src/App.tsx`: top-level app state, login/logout, selected report, selector handling, lazy report loading, export handling.
- `src/api.ts`: frontend wrappers for local `/api` endpoints.
- `src/types.ts`: shared frontend report types.
- `src/reportDisplay.ts`: display helpers, Thai labels, day/date formatting, subject color palette.
- `src/exportImage.ts`: `html-to-image` export sizing and clipping fixes.
- `src/styles.css`: global app styling and KMITL Pro Max-like report styling.
- `src/styles.test.ts`: CSS contract tests for report alignment, grade legend styling, and responsive report scrolling behavior.
- `src/components/LoginView.tsx`: login screen.
- `src/components/AppShell.tsx`: authenticated app layout, tabs, selectors, export/logout controls.
- `src/components/AppFooter.tsx`: shared footer credit.
- `src/components/StudyView.tsx`: study timetable rendering.
- `src/components/ExamView.tsx`: exam timetable and TBA exam rendering.
- `src/components/GradeView.tsx`: grade table, summary, and note rendering.
- `src/components/ReportTitleCard.tsx`: shared Thai report title card.
- `src/components/EmptyState.tsx`: loading, empty, and error states.
- `server/app.js`: shared API/static request handler, security headers, and in-memory session isolation.
- `server/index.js`: local HTTP server entrypoint.
- `api/[...path].js`: Vercel serverless API catch-all entrypoint.
- `vercel.json`: Vercel build, SPA rewrite, API rewrite, and security header configuration.
- `server/registrar/client.js`: registrar login/session/report client.
- `server/registrar/parsers.js`: legacy registrar HTML parsers.
- `server/registrar/apiMappers.js`: KMITL registration API to app report model mappers.

## Local API
All local API responses use `application/json; charset=utf-8` and `Cache-Control: no-store`.

### `GET /api/session`
Returns whether the local backend process currently has an authenticated registrar session.

Response:
```json
{ "loggedIn": true }
```

### `POST /api/login`
Logs in through the registrar integration.

Request:
```json
{ "studentId": "67010000", "password": "secret" }
```

Response:
```json
{ "loggedIn": true }
```

Important behavior:
- Numeric student IDs are submitted to registrar SSO as `<student-id>@kmitl.ac.th`.
- Already-qualified email usernames are submitted unchanged.
- Credentials are not persisted.

### `POST /api/logout`
Clears all in-memory cookies, JWT token, cached semester data, cached academic data, user info, and login state.

Response:
```json
{ "loggedIn": false }
```

### `GET /api/reports/study`
Loads the study timetable.

Query params:
- `semester`: optional selected semester.
- `year`: optional selected Buddhist academic year.

Response type: `StudyReport`.

### `GET /api/reports/exam`
Loads the exam timetable.

Query params:
- `semester`: optional selected semester.
- `year`: optional selected Buddhist academic year.
- `examKind`: optional, `final`, `midterm`, `2`, or `1`.

Response type: `ExamReport`.

### `GET /api/reports/grade`
Loads grade result.

Query params:
- `semester`: optional selected semester.
- `year`: optional selected Buddhist academic year.

Response type: `GradeReport`.

### API Error Shape
Errors are normalized by `server/index.js`.

Response:
```json
{
  "error": {
    "code": "REGISTRAR_ERROR",
    "message": "Readable error message"
  }
}
```

Known local error codes:
- `MISSING_CREDENTIALS`: login request did not include student ID or password.
- `INVALID_LOGIN`: registrar rejected credentials. The user-facing message is `ไม่พบรหัสนักศึกษาหรือรหัสผ่านในระบบ`.
- `SESSION_EXPIRED`: local or registrar session expired.
- `REGISTRAR_CHANGED`: registrar HTML form/report structure changed or could not be parsed.
- `REGISTRAR_ERROR`: generic registrar/backend failure.
- `NOT_FOUND`: unknown local API route.

The API error normalizer honors explicit registrar error codes first and also recognizes the Thai invalid-login message so rejected credentials return `INVALID_LOGIN` with HTTP `401`.

HTTP status mapping:
- `401`: invalid login.
- `440`: session expired.
- `500`: registrar/backend errors.
- `404`: unknown local API route.

## Registrar External Endpoints
Current integration points in `server/registrar/client.js`:
- `https://api.reg.kmitl.ac.th/user/`
  - `function: login-jwt`
  - `function: get-auth-user-info`
- `https://regis.reg.kmitl.ac.th/api/`
  - `function: get-year-semester-now`
  - `function: get-regis-result`
- `https://sso.reg.kmitl.ac.th/realms/registrar/protocol/openid-connect/auth`
  - Keycloak authorization-code flow for legacy PHP session creation.
- `https://sso.reg.kmitl.ac.th/realms/registrar/protocol/openid-connect/token`
  - Exchanges authorization code for access token.
- `https://www.reg.kmitl.ac.th/user/login.php`
  - Creates legacy PHP session from the SSO access token.
- `https://www.reg.kmitl.ac.th/index/index_api.php?function=get-info`
  - Verifies legacy PHP login state.
- `https://www.reg.kmitl.ac.th/u_student/index.php`
  - Authenticated student home page used to discover the raw student-profile content action.
- `https://www.reg.kmitl.ac.th/u_officer/student.php?close_header=1`
  - Authenticated student profile HTML source reached from the student page and used as the only faculty/major source for report title cards.
- Legacy report pages under `https://www.reg.kmitl.ac.th/`.

## Login Flow
1. Frontend posts student ID and password to `POST /api/login`.
2. Backend clears all previous in-memory state.
3. Backend tries current registrar JWT login first:
   - POST to `https://api.reg.kmitl.ac.th/user/` with `function: login-jwt`.
   - Uses the SSO username form: numeric ID becomes `<id>@kmitl.ac.th`.
   - Extracts JWT from registrar response.
   - Calls `get-auth-user-info` to verify and fetch user info.
4. If JWT login works, the backend also attempts to create a legacy PHP session:
   - Opens Keycloak auth URL.
   - Parses the login form.
   - Decodes HTML entities in form action.
   - Posts username/password.
   - Extracts authorization code.
   - Exchanges code for access token.
   - Posts access token to `https://www.reg.kmitl.ac.th/user/login.php`.
   - Verifies with `index_api.php?function=get-info`.
5. If JWT is unavailable, old registrar login fallback remains, but the report URLs are not used as login form discovery pages.
6. On success, the backend stores only in-memory cookies, JWT token, and user info.

## Session And Cache Behavior
Each authenticated browser session gets its own `RegistrarClient` instance keyed by an opaque `kn_session` cookie.

The browser cookie:
- Is `HttpOnly`.
- Uses `SameSite=Lax`.
- Uses `Secure` on HTTPS/hosted requests.
- Contains only a random session ID, not student ID, password, registrar cookies, JWT, or report data.

`RegistrarClient` keeps state in backend memory only:
- `cookies`: legacy PHP cookies.
- `accessToken`: registrar JWT.
- `userInfo`: registrar user profile data.
- `studentProfile`: parsed raw faculty/major from the authenticated student profile page.
- `loggedIn`: local login flag.
- `semesterRowsCache`: registration API rows by year and semester.
- `availableAcademicCache`: available years/semesters discovered for selector options.

State is cleared when:
- User logs out.
- Backend process restarts.
- Login starts again.
- A session-expired error is detected.
- The in-memory browser session expires after 30 minutes of inactivity.

The backend also sets conservative security headers:
- `Content-Security-Policy`.
- `X-Content-Type-Options: nosniff`.
- `Referrer-Policy: no-referrer`.
- `Permissions-Policy` disabling camera, microphone, and geolocation.

## Report Loading Flow
Frontend behavior in `src/App.tsx`:
- Initial tab is `study`.
- On startup, app calls `GET /api/session`.
- After login, the study report loads first.
- Reports are cached in React state after loading.
- Switching to a tab loads that report if not already loaded, without sending the previous tab's selected year or semester as default request params.
- Switching to a different report tab clears that tab's cached report before loading, so the visible timetable/exam/grade table cannot remain from an old semester/year while the selectors reset.
- Changing semester, year, or exam kind clears report state and force-loads the selected active report.
- Selector options from the latest report are saved so controls stay stable while switching views.
- When a newly loaded report returns selected year/semester options, the frontend updates the selector state from that report so values do not carry over incorrectly between study, exam, and grade pages.
- If a report request says the session expired, the app logs out locally and clears report state.

Backend behavior in `RegistrarClient.fetchReport()`:
- If not logged in, throws `Not logged in`.
- If JWT is available, study/exam primarily use the registration API and legacy pages for enrichment/fallback.
- Grade results use the legacy PHP report page because grade data is not currently mapped from the JWT registration API.
- All report types use faculty/major only from the authenticated student profile page. If that profile page cannot be parsed, report title cards leave faculty and major blank instead of using API `faculty_id`, legacy report text, or conversion-table guesses.
- The frontend keeps one central title-card faculty/major identity across cached study, exam, and grade reports. Loading a report with blank profile fields clears those fields from every cached title card, so semesters/years cannot show mixed organization data.
- Available years and semesters are probed from real registration rows and only non-empty options are exposed.

## Academic Option Discovery
- Backend calls `get-year-semester-now` to anchor the current academic year.
- Backend probes candidate academic years and semesters `1`, `2`, and `3`.
- Only years with at least one registration row are returned.
- Available academic years are always sorted from newest to oldest after asynchronous registrar probes finish.
- Only semesters with at least one registration row for the effective year are returned.
- If the requested year or semester has no data, backend falls back to the first available option for that student.
- Year selector options are anchored to registrar current year to avoid dropdown drift when changing years.

## Study Timetable Data
Study timetable can come from:
- Legacy report page, when available and parseable.
- Registration API fallback, mapped by `server/registrar/apiMappers.js`.

Study report shape:
```ts
type StudyReport = {
  type: 'study';
  student: StudentInfo;
  courses: StudyCourse[];
  options?: { semesters?: ApiOption[]; years?: ApiOption[] };
};
```

Study course shape:
```ts
type StudyCourse = {
  code: string;
  name: string;
  credits: string;
  theorySection: string;
  practiceSection: string;
  building: string;
  slots: StudySlot[];
};
```

Study slot behavior:
- Days use `Mon`, `Tue`, etc. internally for registration API rows.
- Display labels show English short label on the first line and Thai weekday on the second line.
- Time placement uses 15-minute CSS grid columns.
- Slots merge when the same subject has same-day, same-type sessions with a gap of 30 minutes or less, matching KMITL Pro Max behavior.
- Subject boxes use centered text.
- One-hour-or-shorter study blocks use a compact wrapped style, retain a title tooltip, and expand on hover, keyboard focus, or touch active state so full subject details stay readable. Mobile and tablet breakpoints keep the timetable scroll canvas wider and rows taller to avoid over-compressing these short blocks.
- Subject colors use the shared sequential palette in `src/reportDisplay.ts`.
- If no study timetable rows exist for the selected semester, the empty-state copy is `ไม่พบตารางเรียนในภาคการศึกษานี้`.

## Exam Timetable Data
Exam timetable can come from:
- Legacy report page, when legacy contains scheduled rows.
- Registration API schedule, when legacy only contains generic final-exam location rows.
- Legacy no-`mid_or_final` report enrichment for room/seat values.

Exam report shape:
```ts
type ExamReport = {
  type: 'exam';
  student: StudentInfo;
  exams: ExamItem[];
  options?: {
    semesters?: ApiOption[];
    years?: ApiOption[];
    examKinds?: ApiOption[];
  };
};
```

Exam item shape:
```ts
type ExamItem = {
  code: string;
  name: string;
  section: string;
  type: string;
  dateRaw: string;
  start: string;
  end: string;
  startMinutes: number;
  endMinutes: number;
  sortKey: number;
  location: string;
  reason?: string;
  isTba: boolean;
};
```

Exam behavior:
- `examKind=final` uses final exam date/time fields from the registration API.
- `examKind=midterm` uses midterm exam date/time fields from the registration API.
- Registrar `Lecture` or `ท` is normalized to `ทฤษฎี`.
- Registrar `Practice` or `ป` is normalized to `ปฏิบัติ`.
- Exam title-card subtitles are compact Thai parenthetical labels:
  - Final: `(ปลายภาค)`
  - Midterm: `(กลางภาค)`
- Exam date labels use Thai Buddhist-calendar dates, for example `16 มี.ค. 2569`, with Thai weekday on the second line.
- Scheduled rows stay in the upper timetable grid.
- If no scheduled exam rows exist for the selected semester, the empty-state copy is Thai.
- Unscheduled rows render under `รายวิชาที่ไม่ระบุตารางสอบ`.
- TBA reasons are merged from the legacy report so unscheduled cards show Thai registrar text such as `สอบในช่วงสอบปลายภาค (ในห้องสอบ)` or `จัดสอบเอง`, not generic `TBA`.
- Generic final-exam location English duplicate text is trimmed.
- Room/seat data is compacted to forms such as `E12-505 (F2)`.
- Final room/seat enrichment is reused for midterm when the registration API has midterm date/time but no midterm room/seat.
- Exam subject boxes and TBA cards center their text.

## Grade Result Data
Grade result currently comes from the legacy PHP report page after the local backend creates a legacy session.

Grade report shape:
```ts
type GradeReport = {
  type: 'grade';
  student: StudentInfo;
  courses: GradeCourse[];
  summary: GradeSummary[];
  notes?: string[];
  options?: { semesters?: ApiOption[]; years?: ApiOption[] };
};
```

Grade behavior:
- Grade table uses KMITL Pro Max-style surface and table treatment.
- Course numbers use the same sequential color palette as subjects.
- `Pre-Semester` summary rows are included when present.
- `Cumulation` styling mirrors KMITL Pro Max:
  - Stronger Cumulation label.
  - Enlarged blue GPS/GPA value styling.
- Student names are de-duplicated when the registrar grade page includes both English and Thai names in the same `Name:` field.
- Legacy grade title-card identity fields are normalized to Thai where known: KMITL university name, Faculty of Engineering, Electrical Engineering bachelor major, and mixed English/Thai `Name:` rows prefer the Thai name.
- Legacy and frontend title-card identity fields do not infer faculty/major from English legacy text or API faculty IDs. Faculty and major must come from the parsed raw Thai student profile data; otherwise those fields are blank.
- If no grade rows exist for the selected semester, the empty-state copy is `ไม่พบผลการเรียนในภาคศึกษานี้`.
- Grade note rendering uses the requested fixed five-line Thai explanation:
  - `หมายเหตุ:`
  - `X = ประกาศเกรดแล้ว   |   X = ยังไม่ประกาศเกรด`
  - `สาเหตุที่เกรดเป็น X เนื่องจากนักศึกษาประเมินการสอนไม่ครบทุกวิชา จะส่งผลต่อ 1 เทอม หากเทอมต่อไปประเมินการสอนครบ ก็จะสามารถเห็นเกรดได้ตามปกติ`
  - `หากต้องการทราบเกรด สามารถขอเอกสาร Transcript ได้ที่สำนักทะเบียนฯ ตามช่องทางที่กำหนด`
  - `ผลการเรียนที่ไม่ผ่านหรือได้เกรด F จะแสดงตามปกติ`
- The note box text is centered.
- The X legend stays on one line where space allows, and each X has its own color styling.

## Legacy HTML Parsing
`server/registrar/parsers.js` handles legacy registrar pages.

Important parser behavior:
- Decodes HTML entities.
- Normalizes whitespace and `<br>` line breaks.
- Handles Thai and mojibake variants where needed because registrar pages may arrive with TIS-620/encoding issues.
- Parses student metadata:
  - university
  - faculty
  - department/major
  - student ID
  - student name
  - semester/year
- Parses study rows, rooms, buildings, and time slots.
- Parses exam rows, dates, time ranges, room/seat locations, generic final-exam location messages, and TBA reasons.
- Parses grade courses, summaries, and notes.
- Parses the authenticated student profile page (`u_officer/student.php?close_header=1`) to extract raw faculty, department, and major values without relying on a conversion table when that page is available.
- Cleans duplicated English translation from `สอบในช่วงสอบปลายภาค (ในห้องสอบ) Examination during the final exam (in the examination room)`.

## Registration API Mapping
`server/registrar/apiMappers.js` maps `get-regis-result` rows to app models.

Important mapper behavior:
- Builds `StudentInfo` from registrar `userInfo`.
- Maps faculty ID to Thai faculty name when known.
- Builds academic option arrays for years, semesters, and exam kinds.
- Maps study rows into grouped courses.
- Maps API study time fields into 15-minute grid slots.
- Merges adjacent same-day slots with short breaks.
- Maps final and midterm exam date/time fields separately.
- Marks exams as TBA when date/time is missing or invalid.
- Normalizes class type labels to Thai.

## Frontend UI And Branding
- App name: `KMITL Nova`.
- Official KMITL logo URL: `https://www.kmitl.ac.th/themes/custom/kmitl/logo.svg`.
- Login screen uses a modern split layout with local asset `/login-bg.jpg`: desktop/tablet show the supplied image as a contained visual panel beside the form, while mobile stacks it as a cropped banner above the form. The image is decorative and does not carry login text.
- Login screen is constrained to the viewport without page scrolling; the login card stays centered in the available main area, keeps a visible gap above the footer, and the KMITL logo is intentionally larger than the compact authenticated header logo.
- Pressing plain Enter in the login form submits the same action as clicking the Login button.
- Login visual images are configured through `public/login-images.txt`, one local path or HTTPS URL per line. Blank lines and `#` comments are ignored. Each line can optionally add a CSS `object-position` value after a pipe, such as `https://example.com/campus.jpg | 50% 35%`; plain lines default to `50% 50%`. The login page cycles through configured images every 5 seconds with a smooth crossfade only, and falls back to `/login-bg.jpg` if the file is missing or empty.
- Login subtitle: `ระบบดึงข้อมูลการเรียน สจล.`
- Login credential note: `ไม่มีการบันทึกรหัสผ่านลงไฟล์หรือฐานข้อมูลใดๆ` (centered).
- Authenticated header subtitle: `ระบบดึงข้อมูลการเรียน สจล.`
- No startup loading screen. The app shows the login page immediately. A background session check still runs so local dev auto-logs in if a session exists.
- Loading states are Thai-first:
  - Report loading: `กำลังโหลดข้อมูลทะเบียน` / `กำลังดึงข้อมูลจาก KMITL`
  - Login submit: `กำลังเข้าสู่ระบบ...`
- Shared empty/error sentence copy is Thai:
  - Error title: `โหลดข้อมูลไม่สำเร็จ`
  - Empty title: `ข้อมูลยังไม่ถูกโหลด`
  - Empty detail: `เลือกรายการที่ต้องการเพื่อโหลดข้อมูล`
  - Grade empty-state copy: `ไม่พบผลการเรียนในภาคศึกษานี้`
- Favicon uses the official KMITL logo SVG from `https://www.kmitl.ac.th/themes/custom/kmitl/logo.svg`.
- Shared footer:
  - Text: `MADE WITH ❤️ BY _BXXR.T`
  - `_BXXR.T` links to `https://www.instagram.com/_bxxr.t/`
- Authenticated tabs:
  - Study timetable.
  - Exam timetable.
  - Grade result.
- Controls:
  - Semester selector.
  - Year selector.
  - Exam kind selector only on exam tab.
  - On phone layouts, semester, year, and exam kind selectors stay compact on one row when present.
  - Export image button.
  - Logout button; on phone layouts it is icon-only and aligned to the right of the app title.
- No manual refresh button.

## Report Title Cards
Report title cards are Thai-first and should include:
- Report header, such as `ตารางเรียน`, `ตารางสอบ`, or `ผลการเรียน`.
- University name.
- Faculty.
- Department/major when available.
- Department labels are reduced to the major line when a major is available from the raw Thai student profile data, so the card shows faculty and major without the extra department prefix.
- If raw Thai student profile data is unavailable or inconsistent with known title-card rules, the card omits faculty and major rather than displaying fallback data.
- Title cards always reserve the same organization row height, even when faculty/major are blank, so report cards stay visually aligned across tabs, semesters, years, and exam kinds.
- Semester/year.
- Student ID and name.
- Exam kind subtitle for exam timetable.
- Long faculty, department/major, and student identity text wraps cleanly in the title card; phone layouts stack identity items to avoid squeezed or uneven lines.

## Image Export
Image export is handled in `src/App.tsx` and `src/exportImage.ts`.

Behavior:
- Finds the `.export-target` inside the current report view.
- Uses `html-to-image` `toJpeg()`.
- Downloads as `kmitl-nova-<report-type>.jpg`.
- Captures full rendered report width/height.
- Adds balanced left and right capture padding by cloning the unchanged desktop report into a temporary wider capture canvas.
- Preserves original report width and internal padding.
- Clones the target DOM node first, wraps it inside a `1px` by `1px` absolute-positioned offscreen container (`overflow: hidden; z-index: -9999`), and positions the inner wrapper using `position: absolute` with the full `canvasWidth` (1400px+). This guarantees Safari/WebKit lays out responsive components (like the title card) at their true full desktop width instead of squishing them to the 390px mobile viewport, while completely preventing document body stretching, visual glitches, or blank outputs.
- Overrides `opacity: 1` in `toJpeg` options style parameter so the exported file is fully solid.
- Disables card drop shadows (`box-shadow: none !important;` on `.kpm-grid`, `.kpm-info-card`, `.kpm-grade-container`, and `.kpm-summary-container`) during desktop export mode. This completely avoids Safari's high-DPI `foreignObject` box-shadow clipping bug, which was causing the faint gray vertical bar behind the right border.
- While exporting is active, the Export button is disabled and its text changes to `Exporting...` to prevent double-triggering.
- Export-desktop mode sets `overflow: visible` on grade/summary containers to prevent scrollbar bleed in the captured image.
- Export-desktop mode keeps report title-card identity rows in desktop formatting even when exporting from a phone viewport, so mobile stacked metadata does not leak into exported images.
- Uses a solid white (`#ffffff`) background for the export wrapper and options to guarantee WebKit encodes any off-screen bounds beautifully.
- Completely removed deprecated `-webkit-overflow-scrolling: touch` rules from stylesheets to prevent WebKit from creating detached hardware-accelerated scroll layers.
- Uses a "double-call" workaround on `toJpeg()` in `handleExport` to trigger layout and paint passes in the WebKit rendering engine before retrieving the final image.
- Prevents side clipping of title/table borders and shadows while keeping blank space even on both sides.
- Export does not include the app header, selectors, footer, logout button, or export button.
- On Chrome/Edge, uses `showSaveFilePicker` for a proper Save As dialog with the correct filename. Other browsers (Safari, Firefox, Brave) use a blob URL anchor download.
- The JPEG data URL is converted to a blob via manual base64 decoding to avoid CSP `connect-src` restrictions on `fetch(dataUrl)`.

## Security Notes
- Do not log user passwords.
- Do not commit credentials.
- Do not store credentials, cookies, JWTs, or registrar sessions on disk.
- Do not move registrar authentication into browser-only code, because CORS and credential exposure would be worse.
- Keep registrar sessions in backend process memory only.
- `Cache-Control: no-store` is used for local API JSON responses.
- Logout and backend restart clear sensitive in-memory state.
- Public hosted deployment must preserve per-session isolation; never return to a single global registrar client.

## Testing
Current test coverage includes:
- Registrar login/client behavior.
- Legacy parser behavior.
- Registration API mapper behavior.
- Report display helpers.
- Export image option sizing.
- CSS expectations.

Useful commands:
- `npm test`
- `npm test -- --run server/registrar/client.test.js`
- `npm test -- --run server/registrar/parsers.test.js`
- `npm test -- --run server/registrar/apiMappers.test.js`
- `npm test -- --run src/reportDisplay.test.ts`
- `npm run build`

## Known Constraints
- Registrar endpoints and HTML structure are external and may change.
- Some legacy registrar pages may return Thai text through TIS-620 or mojibake-like paths, so parser code includes defensive normalization.
- Grade results depend on the legacy PHP session path.
- Midterm room/seat data may be absent from the registration API, so the app reuses legacy no-`mid_or_final` room/seat enrichment.
- The app is currently local-first and not designed for public multi-user hosting without reworking session isolation and deployment security.

## Developer Rules
- Read and understand `.md` files before starting work in this project.
- Update this file whenever adding or changing important behavior, architecture, APIs, security handling, dependencies, or user-facing UI decisions.
- Keep credential handling explicit and conservative.
- Prefer a modern, readable interface for dense academic data over decorative layout.
- Follow existing KMITL Pro Max-like presentation rules unless the user explicitly changes direction.
