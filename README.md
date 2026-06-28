# KMITL Nova

A standalone web application for viewing KMITL registrar data with a modern, clean interface. Supports study timetables, exam timetables, grade results, and image export.

เว็บแอปพลิเคชันสำหรับดูข้อมูลสำนักทะเบียน KMITL (สจล.) ด้วยอินเทอร์เฟซที่ทันสมัยและสะอาดตา รองรับการดูตารางเรียน ตารางสอบ ผลการเรียน และการส่งออกเป็นรูปภาพ

## Features

- **Study Timetable** — Visual grid layout with color-coded subjects, time slots, and room information.
- **Exam Timetable** — Scheduled exams on a date/time grid with unscheduled (TBA) exam cards.
- **Grade Results** — Course grades, semester summary, cumulative GPA, and grade legend.
- **Image Export** — Download any report view as a JPEG image with desktop-quality rendering.
- **Thai-first Interface** — All labels, dates, and status messages in Thai.

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, CSS
- **Backend:** Private API service with serverless proxy
- **Image Export:** html-to-image
- **Icons:** lucide-react
- **Analytics:** Cloudflare Web Analytics
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
2. The application proxies the request securely to a private backend API.
3. Credentials and session data are managed in memory—nothing is written to disk or stored in the browser.
4. The frontend receives structured JSON data and renders the timetable grids and tables.

## Security

- Credentials and session tokens are processed securely by a private backend.
- No student data is persisted to public files, databases, or browser storage.
- Sessions are isolated per browser via secure HTTP cookies.

## Project Structure

```
src/                  Frontend React application
  components/         UI components (login, shell, reports)
  App.tsx             Top-level state and routing
  api.ts              Frontend API client
  styles.css          Global styles
  exportImage.ts      Image export logic

api/                  Vercel serverless proxy entrypoint
vercel.json           Vercel deployment configuration
```


## License

This project is licensed under the [MIT License](LICENSE).
