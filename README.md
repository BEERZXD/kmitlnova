# KMITL Nova

A standalone web application for viewing KMITL registrar data with a modern, clean interface. Supports study timetables, exam timetables, grade results, and image export.

## Features

- **Study Timetable** — Visual grid layout with color-coded subjects, time slots, and room information.
- **Exam Timetable** — Scheduled exams on a date/time grid with unscheduled (TBA) exam cards.
- **Grade Results** — Course grades, semester summary, cumulative GPA, and grade legend.
- **Image Export** — Download any report view as a JPEG image with desktop-quality rendering.
- **Thai-first Interface** — All labels, dates, and status messages in Thai.

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, CSS
- **Backend:** Node.js with native HTTP and per-session in-memory state
- **Image Export:** html-to-image
- **Icons:** lucide-react
- **Hosting:** Vercel (Singapore region)

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install

```
npm install
```

### Development

```
npm run dev
```

Starts the backend server on `http://127.0.0.1:8787` and the Vite dev server on `http://127.0.0.1:5173`.

### Build

```
npm run build
```

### Run Tests

```
npm test
```

## How It Works

1. The user logs in with their KMITL student ID and password.
2. The backend authenticates against the KMITL registrar via JWT and legacy SSO flows.
3. Credentials and session data are held in server memory only — nothing is written to disk or stored in the browser.
4. Report data is fetched from registrar APIs and legacy HTML pages, parsed, and returned as structured JSON.
5. The frontend renders the data in timetable grids and tables.

## Security

- Credentials, cookies, and JWT tokens exist only in backend process memory.
- No student data is persisted to files, databases, or browser storage.
- Sessions are isolated per browser via an opaque `HttpOnly` cookie.
- Sessions expire after 30 minutes of inactivity.
- All state is cleared on logout or server restart.

## Project Structure

```
src/                  Frontend React application
  components/         UI components (login, shell, reports)
  App.tsx             Top-level state and routing
  api.ts              Frontend API client
  styles.css          Global styles
  exportImage.ts      Image export logic

server/               Backend Node.js server
  app.js              Request handler and session management
  index.js            Local HTTP server entrypoint
  registrar/          KMITL registrar integration
    client.js         Login, session, and report fetching
    parsers.js        Legacy HTML page parsers
    apiMappers.js     Registration API to app model mappers

api/                  Vercel serverless entrypoint
vercel.json           Vercel deployment configuration
```

## License

Private project. Not licensed for redistribution.
