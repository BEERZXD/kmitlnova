import { useEffect, useMemo, useRef, useState } from 'react';
import { toJpeg } from 'html-to-image';
import { fetchReport, getSession, login as loginRequest, logout as logoutRequest } from './api';
import { AppShell } from './components/AppShell';
import { EmptyState } from './components/EmptyState';
import { ExamView } from './components/ExamView';
import { GradeView } from './components/GradeView';
import { LoginView } from './components/LoginView';
import { StudyView } from './components/StudyView';
import { buildExportImageOptions, createCenteredExportNode, withDesktopExportLayout } from './exportImage';
import type { ApiOption, ReportData, ReportParams, ReportType } from './types';

const initialTab: ReportType = 'study';

function selectedOption(options: ApiOption[]) {
  return options.find((option) => option.selected)?.value ?? options[0]?.value ?? '';
}

function nextSelection(options: ApiOption[], current: string) {
  return selectedOption(options) || current;
}

function optionsFor(report: ReportData | undefined, key: 'semesters' | 'years' | 'examKinds') {
  return ((report?.options ?? {}) as Record<string, ApiOption[]>)[key] ?? [];
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);

  const [loginError, setLoginError] = useState('');
  const [active, setActive] = useState<ReportType>(initialTab);
  const [reports, setReports] = useState<Partial<Record<ReportType, ReportData>>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedExamKind, setSelectedExamKind] = useState('');
  const [savedSemesterOptions, setSavedSemesterOptions] = useState<ApiOption[]>([]);
  const [savedYearOptions, setSavedYearOptions] = useState<ApiOption[]>([]);
  const [savedExamKindOptions, setSavedExamKindOptions] = useState<ApiOption[]>([]);
  const exportRef = useRef<HTMLDivElement>(null);

  const activeReport = reports[active];
  const semesterOptions = optionsFor(activeReport, 'semesters').length ? optionsFor(activeReport, 'semesters') : savedSemesterOptions;
  const yearOptions = optionsFor(activeReport, 'years').length ? optionsFor(activeReport, 'years') : savedYearOptions;
  const examKindOptions = active === 'exam'
    ? (optionsFor(activeReport, 'examKinds').length ? optionsFor(activeReport, 'examKinds') : savedExamKindOptions)
    : [];

  const params = useMemo<ReportParams>(() => ({
    semester: selectedSemester || undefined,
    year: selectedYear || undefined,
    examKind: active === 'exam' && selectedExamKind ? selectedExamKind : undefined,
  }), [active, selectedExamKind, selectedSemester, selectedYear]);

  async function loadReport(type: ReportType, force = false, overrideParams?: ReportParams) {
    if (!loggedIn) return;
    if (!force && reports[type]) return;

    setLoading(true);
    setError('');
    try {
      const data = await fetchReport(type, overrideParams ?? (type === active ? params : {}));
      setReports((current) => ({ ...current, [type]: data }));
      const nextSemesterOptions = optionsFor(data, 'semesters');
      const nextYearOptions = optionsFor(data, 'years');
      if (nextSemesterOptions.length) setSavedSemesterOptions(nextSemesterOptions);
      if (nextYearOptions.length) setSavedYearOptions(nextYearOptions);
      setSelectedSemester((current) => nextSelection(nextSemesterOptions, current));
      setSelectedYear((current) => nextSelection(nextYearOptions, current));
      if (data.type === 'exam') {
        const nextExamKindOptions = data.options?.examKinds ?? [];
        if (nextExamKindOptions.length) setSavedExamKindOptions(nextExamKindOptions);
        setSelectedExamKind((current) => nextSelection(nextExamKindOptions, current));
      }
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Could not load registrar data.';
      if (/expired|not logged in/i.test(message)) {
        setLoggedIn(false);
        setReports({});
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    getSession()
      .then((session) => setLoggedIn(session.loggedIn))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (loggedIn) void loadReport(active);
  }, [active, loggedIn]);

  async function handleLogin(studentId: string, password: string) {
    setLoginError('');
    setLoading(true);
    try {
      await loginRequest(studentId, password);
      setLoggedIn(true);
      setActive(initialTab);
      setReports({});
      setSavedSemesterOptions([]);
      setSavedYearOptions([]);
      setSavedExamKindOptions([]);
    } catch (loginErrorValue) {
      setLoginError(loginErrorValue instanceof Error ? loginErrorValue.message : 'Login failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await logoutRequest().catch(() => undefined);
    setLoggedIn(false);
    setReports({});
    setSelectedSemester('');
    setSelectedYear('');
    setSelectedExamKind('');
    setSavedSemesterOptions([]);
    setSavedYearOptions([]);
    setSavedExamKindOptions([]);
  }

  async function handleExport() {
    const node = exportRef.current?.querySelector('.export-target') as HTMLElement | null;
    if (!node) return;
    const dataUrl = await withDesktopExportLayout(node, async () => {
      const capture = createCenteredExportNode(node);
      try {
        return await toJpeg(capture.node, buildExportImageOptions(capture.node));
      } finally {
        capture.cleanup();
      }
    });
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `kmitl-nova-${active}.jpg`;
    link.href = blobUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  }

  function handleSelectionChange(next: Partial<ReportParams>) {
    const merged = {
      semester: next.semester ?? selectedSemester,
      year: next.year ?? selectedYear,
      examKind: next.examKind ?? selectedExamKind,
    };

    if (next.semester !== undefined) setSelectedSemester(merged.semester);
    if (next.year !== undefined) setSelectedYear(merged.year);
    if (next.examKind !== undefined) setSelectedExamKind(merged.examKind);
    setReports((current) => ({ ...current, study: undefined, exam: undefined, grade: undefined }));
    void loadReport(active, true, merged);
  }



  if (!loggedIn) {
    return <LoginView error={loginError} isLoading={loading} onSubmit={handleLogin} />;
  }

  return (
    <AppShell
      active={active}
      isLoading={loading}
      semesterOptions={semesterOptions}
      yearOptions={yearOptions}
      examKindOptions={examKindOptions}
      selectedSemester={selectedSemester}
      selectedYear={selectedYear}
      selectedExamKind={selectedExamKind}
      onTabChange={setActive}
      onSemesterChange={(value) => handleSelectionChange({ semester: value })}
      onYearChange={(value) => handleSelectionChange({ year: value })}
      onExamKindChange={(value) => handleSelectionChange({ examKind: value })}
      onExport={() => void handleExport()}
      onLogout={() => void handleLogout()}
    >
      <div ref={exportRef}>
        {loading && !activeReport ? (
          <EmptyState state="loading" title="กำลังโหลดข้อมูลทะเบียน" detail="กำลังดึงข้อมูลจาก KMITL" />
        ) : error ? (
          <EmptyState state="error" title="Could not load this view" detail={error} onRetry={() => void loadReport(active, true)} />
        ) : activeReport?.type === 'study' ? (
          <StudyView report={activeReport} />
        ) : activeReport?.type === 'exam' ? (
          <ExamView report={activeReport} />
        ) : activeReport?.type === 'grade' ? (
          <GradeView report={activeReport} />
        ) : (
          <EmptyState state="empty" title="No data loaded yet" detail="Choose a view to load registrar data." />
        )}
      </div>
    </AppShell>
  );
}
