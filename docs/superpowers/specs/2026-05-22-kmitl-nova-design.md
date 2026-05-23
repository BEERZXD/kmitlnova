# KMITL Nova Design

## Goal
Build KMITL Nova as a local-first standalone webapp that logs into the KMITL registrar, fetches live student academic data, and renders modern views for class timetable, exam timetable, and grade results.

## Architecture
KMITL Nova has a browser frontend and a local backend. The frontend renders the app shell, login view, academic tabs, selectors, tables, grids, and image export. The backend owns registrar login, session cookies, page fetching, timeout detection, and HTML parsing.

The frontend never stores the student ID, password, registrar cookies, or session tokens. Credentials and registrar session state live only in memory inside the local backend process and are cleared on logout or process restart.

## Tech Stack
- React + Vite for the frontend.
- Express-compatible Node HTTP server for the local backend.
- Vitest for parser and API unit tests.
- `html-to-image` for image export.
- Native `fetch` and a small cookie jar for registrar requests.

## User Flow
1. User opens the local KMITL Nova app.
2. User enters student ID and password on the login screen.
3. Backend logs into the registrar and keeps the registrar session in memory.
4. The dashboard opens with tabs for `ตารางเรียน`, `ตารางสอบ`, and `ผลการเรียน`.
5. Only the active section is fetched first.
6. Switching sections fetches that section on demand and keeps the returned data in frontend memory until refresh or logout.
7. Logout clears frontend state and backend registrar session state.

## Views
### Study Timetable
The study view uses a day-by-time grid similar to KMITL Pro Max. It includes student/semester context, subject color coding, room/building details, section/type metadata, refresh, selector controls where supported, and image export.

### Exam Timetable
The exam view uses a date-by-time grid for scheduled exams and a separate list for unscheduled exams. It includes midterm/final selection where supported, refresh, and image export.

### Grade Results
The grade view uses a clean course table, grade color chips, and a GPA summary section. It includes semester/year selection where supported, refresh, and image export.

## Registrar Integration
The backend first visits registrar pages and follows the login flow. It parses login forms when possible, submits credentials through the local backend, stores registrar cookies in memory, and fetches the selected report pages.

Report URLs are based on the existing KMITL Pro Max targets:
- `https://www.reg.kmitl.ac.th/u_student/report_studytable_show.php`
- `https://www.reg.kmitl.ac.th/u_student/report_examtable_show.php`
- `https://www.reg.kmitl.ac.th/u_student/report_gradetable_show.php`

The registrar client should keep endpoint details isolated so they can be adjusted if the official website changes.

## Error Handling
- Invalid login: show a clear login error.
- Expired registrar session: clear local session and return to login.
- Registrar unavailable: show a retry state.
- Parser mismatch: show a “could not parse registrar page” message and log a technical detail locally.
- Network/backend failure: show a non-destructive error state with retry.

## Visual Direction
The product is an academic dashboard, not a landing page. It should use a quiet, dense layout with white surfaces, subtle borders, strong typography, controlled KMITL orange accent, and a subject color system for course blocks. The first useful screen after login should show the selected academic view immediately.

## V1 Scope
- Local React + Vite frontend and local Node backend.
- Real registrar login through the local backend.
- In-memory-only credentials and registrar session.
- On-demand loading by active section.
- Study timetable, exam timetable, grade result.
- Semester/year selection where available.
- Midterm/final exam selection where available.
- Image export only.
- Thai/English language style like KMITL Pro Max.
- Project docs updated when important decisions change.

## Out of Scope for V1
- Online deployment.
- Persistent login.
- Password or student ID storage.
- PDF export.
- Database storage.
- Multi-user server mode.

## Self Review
- No placeholders or undecided requirements remain in this v1 spec.
- Credential handling is intentionally conservative.
- The scope is broad but still one cohesive local app: login, fetch, parse, display, export.
- Registrar endpoint details are isolated because the official site may change.
