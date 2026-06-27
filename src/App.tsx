import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';

import { fetchReport, getSession, login as loginRequest, logout as logoutRequest } from './api';
import { EmptyState } from './components/EmptyState';
import { LoginView } from './components/LoginView';
import { buildExportImageOptions, createCenteredExportNode } from './exportImage';
import type { ApiOption, ReportData, ReportParams, ReportType } from './types';

import { AppShell } from './components/AppShell';

const initialTab: ReportType = 'study';
const StudyView = lazy(() => import('./components/StudyView').then((module) => ({ default: module.StudyView })));
const ExamView = lazy(() => import('./components/ExamView').then((module) => ({ default: module.ExamView })));
const GradeView = lazy(() => import('./components/GradeView').then((module) => ({ default: module.GradeView })));

type TitleIdentity = {
  faculty: string;
  department: string;
};

function selectedOption(options: ApiOption[]) {
  return options.find((option) => option.selected)?.value ?? options[0]?.value ?? '';
}

function nextSelection(options: ApiOption[], current: string) {
  return selectedOption(options) || current;
}

function optionsFor(report: ReportData | undefined, key: 'semesters' | 'years' | 'examKinds') {
  return ((report?.options ?? {}) as Record<string, ApiOption[]>)[key] ?? [];
}

type SelectionValues = {
  semester: string;
  year: string;
  examKind: string;
};

function reportParamsFromSelection(selection: SelectionValues): ReportParams {
  const params: ReportParams = {};
  if (selection.semester) params.semester = selection.semester;
  if (selection.year) params.year = selection.year;
  if (selection.examKind) params.examKind = selection.examKind;
  return params;
}

export function getReportLoadParams(_currentSelection: SelectionValues, explicitParams?: ReportParams): ReportParams {
  return explicitParams ?? {};
}

export function getSelectionChangeState(current: SelectionValues, next: Partial<ReportParams>) {
  const yearChanged = next.year !== undefined && next.year !== current.year;
  const nextSelected = {
    semester: yearChanged ? '' : next.semester ?? current.semester,
    year: next.year ?? current.year,
    examKind: next.examKind ?? current.examKind,
  };

  return {
    nextSelected,
    reportParams: reportParamsFromSelection(nextSelected),
    resetSemesterOptions: yearChanged,
  };
}

export function titleIdentityFromReport(report: ReportData): TitleIdentity {
  return {
    faculty: report.student.faculty ?? '',
    department: report.student.department ?? '',
  };
}

function withTitleIdentity<T extends ReportData>(report: T, identity: TitleIdentity): T {
  return {
    ...report,
    student: {
      ...report.student,
      faculty: identity.faculty,
      department: identity.department,
    },
  } as T;
}

export function applyTitleIdentityToReports(
  reports: Partial<Record<ReportType, ReportData>>,
  identity: TitleIdentity,
) {
  return Object.fromEntries(
    Object.entries(reports).map(([type, report]) => [
      type,
      report ? withTitleIdentity(report, identity) : report,
    ]),
  ) as Partial<Record<ReportType, ReportData>>;
}

export function clearReportForTab(
  reports: Partial<Record<ReportType, ReportData>>,
  type: ReportType,
) {
  return {
    ...reports,
    [type]: undefined,
  };
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [loginError, setLoginError] = useState('');
  const [active, setActive] = useState<ReportType>(initialTab);
  const activeRef = useRef<ReportType>(initialTab);
  const [reports, setReports] = useState<Partial<Record<ReportType, ReportData>>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedExamKind, setSelectedExamKind] = useState('');
  const [savedSemesterOptions, setSavedSemesterOptions] = useState<ApiOption[]>([]);
  const [savedYearOptions, setSavedYearOptions] = useState<ApiOption[]>([]);
  const [savedExamKindOptions, setSavedExamKindOptions] = useState<ApiOption[]>([]);
  const [titleIdentity, setTitleIdentity] = useState<TitleIdentity | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const inflightRequests = useRef<Set<ReportType>>(new Set());

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

  async function loadReport(type: ReportType, force = false, overrideParams?: ReportParams, silent = false) {
    if (!loggedIn) return;
    if (!force && reports[type]) return;

    if (!silent) setLoading(true);
    if (inflightRequests.current.has(type)) return;

    inflightRequests.current.add(type);
    if (!silent) setError('');
    try {
      const data = await fetchReport(type, getReportLoadParams({
        semester: selectedSemester,
        year: selectedYear,
        examKind: type === 'exam' ? selectedExamKind : '',
      }, overrideParams));
      const nextTitleIdentity = titleIdentityFromReport(data);
      setTitleIdentity(nextTitleIdentity);
      setReports((current) => applyTitleIdentityToReports({
        ...current,
        [type]: data,
      }, nextTitleIdentity));
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
      inflightRequests.current.delete(type);
      if (type === activeRef.current) setLoading(false);
    }
  }

  useEffect(() => {
    getSession()
      .then((session) => setLoggedIn(session.loggedIn))
      .catch(() => {});
  }, []);


  useEffect(() => {
    import('./kanitFonts')
      .then(({ kanitFontsCSS }) => {
        if (!document.getElementById('kanit-base64-cache')) {
          const styleEl = document.createElement('style');
          styleEl.id = 'kanit-base64-cache';
          styleEl.innerHTML = kanitFontsCSS;
          document.head.appendChild(styleEl);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (loggedIn) void loadReport(active);
  }, [active, loggedIn]);

  function handleTabChange(type: ReportType) {
    if (type === active) return;
    setLoading(true);
    setActive(type);
    activeRef.current = type;
    setError('');
    if (type !== 'exam') setSelectedExamKind('');
    if (type !== 'exam') setSavedExamKindOptions([]);
    setReports((current) => clearReportForTab(current, type));
  }

  function handleTabPrefetch(type: ReportType) {
    void loadReport(type, false, undefined, true);
  }

  async function handleLogin(studentId: string, password: string) {
    setLoginError('');
    setLoading(true);
    try {
      await loginRequest(studentId, password);
      // Wait for LoginView to play its animation before setting loggedIn(true)
      setActive(initialTab);
      setReports({});
      setTitleIdentity(null);
      setSavedSemesterOptions([]);
      setSavedYearOptions([]);
      setSavedExamKindOptions([]);
    } catch (loginErrorValue) {
      setLoginError(loginErrorValue instanceof Error ? loginErrorValue.message : 'Login failed.');
      throw loginErrorValue;
    } finally {
      setLoading(false);
    }
  }

  function handleLoginAnimationComplete() {
    setLoggedIn(true);
  }

  async function handleLogout() {
    await logoutRequest().catch(() => undefined);
    setLoggedIn(false);
    setReports({});
    setTitleIdentity(null);
    setSelectedSemester('');
    setSelectedYear('');
    setSelectedExamKind('');
    setSavedSemesterOptions([]);
    setSavedYearOptions([]);
    setSavedExamKindOptions([]);
  }

  async function handleExport(format: 'image' | 'pdf') {
    const node = exportRef.current?.querySelector('.export-target') as HTMLElement | null;
    if (!node) return;

    setIsExporting(true);

    // Defer the heavy import and image generation to allow the browser 
    // to paint the "Exporting..." state change first.
    setTimeout(async () => {
      try {
        const { toJpeg } = await import('html-to-image');
        const { kanitFontsCSS } = await import('./kanitFonts');

        // Find and temporarily disable Google Fonts stylesheets to prevent html-to-image from duplicate crawling
        const googleFontSheets = Array.from(document.styleSheets).filter(
          (sheet) => sheet.href?.includes('fonts.googleapis.com')
        );
        googleFontSheets.forEach((sheet) => {
          sheet.disabled = true;
        });

        const capture = createCenteredExportNode(node);
        let dataUrl: string;
        let exportOptions: ReturnType<typeof buildExportImageOptions> & { fontEmbedCSS: string };
        try {
          // Wait one frame to let browser compute styles of offscreen clone
          await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));

          exportOptions = {
            ...buildExportImageOptions(capture.node),
            fontEmbedCSS: kanitFontsCSS,
          };

          // Single capture without the Safari double-call to halve the rendering time
          dataUrl = await toJpeg(capture.node, exportOptions);
        } finally {
          capture.cleanup();
          
          // Restore page state instantly with no visual FOUT
          googleFontSheets.forEach((sheet) => {
            sheet.disabled = false;
          });
        }

        if (format === 'pdf') {
          const { jsPDF } = await import('jspdf');
          
          const pdfWidth = exportOptions.width;
          const height = exportOptions.height;
          const orientation = pdfWidth > height ? 'l' : 'p';
          
          const pdf = new jsPDF({
            orientation,
            unit: 'px',
            format: [pdfWidth, height],
          });
          
          pdf.addImage(dataUrl, 'JPEG', 0, 0, pdfWidth, height);
          const fileName = `kmitl-nova-${active}.pdf`;
          // Force generic binary MIME type so iOS Safari shows download prompt instead of opening it
          const blob = new Blob([pdf.output('blob')], { type: 'application/octet-stream' });

          if ('showSaveFilePicker' in window) {
            try {
              const handle = await (window as any).showSaveFilePicker({
                suggestedName: fileName,
                types: [{ description: 'PDF Document', accept: { 'application/pdf': ['.pdf'] } }],
              });
              const writable = await handle.createWritable();
              await writable.write(blob);
              await writable.close();
              setIsExporting(false);
              return;
            } catch { /* user cancelled */ }
            setIsExporting(false);
            return;
          }

          // Safari/Firefox/Brave: anchor download works fine
          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = fileName;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);
          }, 10000);
        } else {
          const fileName = `kmitl-nova-${active}.jpg`;
          const [header, base64] = dataUrl.split(',');
          const mime = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
          const binary = atob(base64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          const blob = new Blob([bytes], { type: mime });

          // Chrome/Edge: use Save As dialog with correct filename
          if ('showSaveFilePicker' in window) {
            try {
              const handle = await (window as any).showSaveFilePicker({
                suggestedName: fileName,
                types: [{ description: 'JPEG Image', accept: { 'image/jpeg': ['.jpg'] } }],
              });
              const writable = await handle.createWritable();
              await writable.write(blob);
              await writable.close();
              setIsExporting(false);
              return;
            } catch { /* user cancelled, do nothing */ }
            setIsExporting(false);
            return;
          }

          // Safari/Firefox/Brave: anchor download works fine
          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = fileName;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);
          }, 10000);
        }
      } catch (err) {
        console.error(err);
        alert(`Export error: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setIsExporting(false);
      }
    }, 100);
  }

  function handleSelectionChange(next: Partial<ReportParams>) {
    const { nextSelected, reportParams, resetSemesterOptions } = getSelectionChangeState({
      semester: selectedSemester,
      year: selectedYear,
      examKind: selectedExamKind,
    }, next);

    setLoading(true);
    setError('');
    if (next.semester !== undefined || resetSemesterOptions) setSelectedSemester(nextSelected.semester);
    if (next.year !== undefined) setSelectedYear(nextSelected.year);
    if (next.examKind !== undefined) setSelectedExamKind(nextSelected.examKind);
    if (resetSemesterOptions) setSavedSemesterOptions([]);
    // Keep the active report visible during loading (overlay dims it).
    // Clear only non-active tabs so they reload with the new semester/year.
    setReports((current) => {
      const kept = { ...current };
      for (const key of Object.keys(kept) as ReportType[]) {
        if (key !== active) kept[key] = undefined;
      }
      return titleIdentity ? applyTitleIdentityToReports(kept, titleIdentity) : kept;
    });
    void loadReport(active, true, reportParams);
  }

  if (!loggedIn) {
    return <LoginView error={loginError} isLoading={loading} onSubmit={handleLogin} onSuccess={handleLoginAnimationComplete} />;
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
      onTabChange={handleTabChange}
      onTabPrefetch={handleTabPrefetch}
      onSemesterChange={(value) => handleSelectionChange({ semester: value })}
      onYearChange={(value) => handleSelectionChange({ year: value })}
      onExamKindChange={(value) => handleSelectionChange({ examKind: value })}
      onExport={(format) => void handleExport(format)}
      onLogout={() => void handleLogout()}
      isExporting={isExporting}
    >
      <Suspense fallback={<EmptyState state="loading" title="กำลังโหลดข้อมูลทะเบียน" detail="กำลังดึงข้อมูลจาก KMITL" />}>
        <div ref={exportRef} className={`report-content-area${loading ? ' report-content-loading' : ''}`}>
          {loading && !activeReport ? (
            <EmptyState state="loading" title="กำลังโหลดข้อมูลทะเบียน" detail="กำลังดึงข้อมูลจาก KMITL" />
          ) : error && !activeReport ? (
            <EmptyState state="error" title="โหลดข้อมูลไม่สำเร็จ" detail={error} onRetry={() => void loadReport(active, true, params)} />
          ) : activeReport?.type === 'study' ? (
            <StudyView report={activeReport} />
          ) : activeReport?.type === 'exam' ? (
            <ExamView report={activeReport} />
          ) : activeReport?.type === 'grade' ? (
            <GradeView report={activeReport} />
          ) : (
            <EmptyState state="empty" title="ข้อมูลยังไม่ถูกโหลด" detail="เลือกรายการที่ต้องการเพื่อโหลดข้อมูล" />
          )}
          {loading && activeReport ? <div className="report-loading-overlay" /> : null}
          {error && activeReport ? (
            <div className="report-error-banner">
              <span>{error}</span>
              <button type="button" className="secondary-button" onClick={() => void loadReport(active, true, params)}>ลองอีกครั้ง</button>
            </div>
          ) : null}
        </div>
      </Suspense>
    </AppShell>
  );
}
