import { Download, Image as ImageIcon, FileText, LogOut } from 'lucide-react';
import type { ReactNode } from 'react';
import type { ApiOption, ReportType } from '../types';
import { AppFooter } from './AppFooter';

const tabs: Array<{ type: ReportType; label: string; sublabel: string }> = [
  { type: 'study', label: 'ตารางเรียน', sublabel: 'Study timetable' },
  { type: 'exam', label: 'ตารางสอบ', sublabel: 'Exam timetable' },
  { type: 'grade', label: 'ผลการเรียน', sublabel: 'Grade table' },
];

type AppShellProps = {
  active: ReportType;
  isLoading: boolean;
  semesterOptions: ApiOption[];
  yearOptions: ApiOption[];
  examKindOptions: ApiOption[];
  selectedSemester: string;
  selectedYear: string;
  selectedExamKind: string;
  onTabChange: (type: ReportType) => void;
  onSemesterChange: (value: string) => void;
  onYearChange: (value: string) => void;
  onExamKindChange: (value: string) => void;
  onExport: (format: 'image' | 'pdf') => void;
  onLogout: () => void;
  isExporting?: boolean;
  children: ReactNode;
};

function SelectControl({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  options: ApiOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  if (!options.length) return null;

  return (
    <label className={`select-control${disabled ? ' select-control-loading' : ''}`}>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}>
        {options.map((option) => (
          <option key={`${label}-${option.value}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function AppShell({
  active,
  isLoading,
  semesterOptions,
  yearOptions,
  examKindOptions,
  selectedSemester,
  selectedYear,
  selectedExamKind,
  onTabChange,
  onSemesterChange,
  onYearChange,
  onExamKindChange,
  onExport,
  onLogout,
  isExporting = false,
  children,
}: AppShellProps) {
  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup compact">
          <div>
            <h1><span>KMITL</span> Nova</h1>
            <p>ระบบดึงข้อมูลการเรียน สจล.</p>
          </div>
        </div>

        <button className="icon-text-button logout-button" type="button" onClick={onLogout} aria-label="Logout" title="Logout">
          <LogOut size={18} />
          <span className="logout-label">Logout</span>
        </button>
      </header>

      <nav className="tabbar" aria-label="Academic views">
        {tabs.map((tab) => (
          <button
            key={tab.type}
            className={active === tab.type ? 'tab active' : 'tab'}
            type="button"
            onClick={() => onTabChange(tab.type)}
          >
            <span>{tab.label}</span>
            <small>{tab.sublabel}</small>
          </button>
        ))}
      </nav>

      <section className="actionbar">
        <div className="selectors">
          <SelectControl label="Semester" value={selectedSemester} options={semesterOptions} onChange={onSemesterChange} disabled={isLoading} />
          <SelectControl label="Year" value={selectedYear} options={yearOptions} onChange={onYearChange} disabled={isLoading} />
          {active === 'exam' ? (
            <SelectControl label="Exam" value={selectedExamKind} options={examKindOptions} onChange={onExamKindChange} disabled={isLoading} />
          ) : null}
        </div>
        <div className="actions">
          <div className="export-dropdown">
            <button className="icon-text-button" type="button" disabled={isLoading || isExporting} title="Export">
              <Download size={18} />
              {isExporting ? 'Exporting...' : 'Export'}
            </button>
            <div className="export-dropdown-content">
              <button type="button" onClick={() => onExport('image')} disabled={isLoading || isExporting}>
                <ImageIcon size={16} /> Image (.jpg)
              </button>
              <button type="button" onClick={() => onExport('pdf')} disabled={isLoading || isExporting}>
                <FileText size={16} /> PDF (.pdf)
              </button>
            </div>
          </div>
        </div>
      </section>

      {children}
      <AppFooter />
    </main>
  );
}
