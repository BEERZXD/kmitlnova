# KMITL Nova Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local-first KMITL Nova app that logs into the registrar, fetches selected live report pages, parses timetable/exam/grade data, renders modern academic views, and exports rendered views as images.

**Architecture:** The app uses a React frontend and a local Node backend. The backend keeps credentials and registrar cookies in memory, fetches official registrar pages, and returns normalized JSON. The frontend handles login, tabs, selectors, view rendering, refresh, logout, and image export.

**Tech Stack:** React, Vite, TypeScript, Vitest, Node HTTP server, native fetch, html-to-image.

---

## File Structure
- `package.json`: scripts and dependencies for frontend, backend, tests, and build.
- `index.html`: Vite entry shell.
- `src/main.tsx`: React entry point.
- `src/App.tsx`: app state, login flow, tab loading, refresh, logout.
- `src/styles.css`: complete app styling and responsive layout.
- `src/types.ts`: shared frontend data types.
- `src/api.ts`: local backend API client.
- `src/components/LoginView.tsx`: login form.
- `src/components/AppShell.tsx`: dashboard shell, tabs, actions.
- `src/components/StudyView.tsx`: study timetable grid.
- `src/components/ExamView.tsx`: exam timetable grid/list.
- `src/components/GradeView.tsx`: grade table and summary.
- `src/components/EmptyState.tsx`: loading/error/empty state component.
- `server/index.js`: local backend server and API routes.
- `server/registrar/client.js`: registrar login/session/fetch client.
- `server/registrar/parsers.js`: HTML parsers for registrar reports.
- `server/registrar/types.js`: parser shape documentation through JSDoc.
- `server/registrar/parsers.test.js`: unit tests for parser behavior.
- `project.md`: living project notes.

## Tasks
- [ ] Create package and app scaffolding.
- [ ] Write parser tests for study, exam, and grade HTML.
- [ ] Implement parser functions until tests pass.
- [ ] Implement in-memory registrar client and local API routes.
- [ ] Build React login and dashboard state flow.
- [ ] Build study, exam, and grade views.
- [ ] Add image export.
- [ ] Style desktop and mobile layouts.
- [ ] Run tests and build.
- [ ] Start local dev server and verify reachable URL.

## Verification Commands
- `npm test`
- `npm run build`
- `npm run dev`

## Notes
The registrar login flow may need adjustment after testing with real credentials because the official site can change hidden fields, input names, redirects, or session behavior. Keep that logic isolated in `server/registrar/client.js`.
