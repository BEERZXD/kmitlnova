import type { ApiError, ReportData, ReportParams, ReportType } from './types';

async function parseResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = data.error as ApiError | undefined;
    throw new Error(error?.message ?? `Request failed with status ${response.status}`);
  }
  return data as T;
}

export async function getSession() {
  const response = await fetch('/api/session');
  return parseResponse<{ loggedIn: boolean }>(response);
}

export async function login(studentId: string, password: string) {
  const response = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId, password }),
  });
  return parseResponse<{ loggedIn: boolean }>(response);
}

export async function logout() {
  const response = await fetch('/api/logout', { method: 'POST' });
  return parseResponse<{ loggedIn: boolean }>(response);
}

export async function fetchReport(type: ReportType, params: ReportParams = {}) {
  const query = new URLSearchParams();
  if (params.semester) query.set('semester', params.semester);
  if (params.year) query.set('year', params.year);
  if (params.examKind) query.set('examKind', params.examKind);

  const response = await fetch(`/api/reports/${type}${query.size ? `?${query}` : ''}`);
  return parseResponse<ReportData>(response);
}
