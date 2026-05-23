import { Download, LogOut } from 'lucide-react';
import type { ReactNode } from 'react';
import type { ApiOption, ReportType } from '../types';
import { AppFooter } from './AppFooter';

const kmitlLogoUrl = 'https://www.kmitl.ac.th/themes/custom/kmitl/logo.svg';

const tabs: Array<{ type: ReportType; label: string; sublabel: string }> = [
  { type: 'study', label: 'ตารางเรียน', sublabel: 'Study timetable' },
  { type: 'exam', label: 'ตารางสอบ', sublabel: 'Exam timetable' },
  { type: 'grade', label: 'ผลการเรียน', sublabel: 'Grade result' },
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
  onExport: () => void;
  onLogout: () => void;
  children: ReactNode;
};

function SelectControl({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: ApiOption[];
  onChange: (value: string) => void;
}) {
  if (!options.length) return null;

  return (
    <label className="select-control">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
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
  children,
}: AppShellProps) {
  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup compact">
          <img className="brand-mark" src={kmitlLogoUrl} alt="KMITL logo" />
          <div>
            <h1>KMITL Nova</h1>
            <p>ดูตารางเรียน ตารางสอบ และผลการเรียน สจล. ได้ง่ายๆ!</p>
          </div>
        </div>

        <button className="icon-text-button" type="button" onClick={onLogout}>
          <LogOut size={18} />
          Logout
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
          <SelectControl label="Semester" value={selectedSemester} options={semesterOptions} onChange={onSemesterChange} />
          <SelectControl label="Year" value={selectedYear} options={yearOptions} onChange={onYearChange} />
          {active === 'exam' ? (
            <SelectControl label="Exam" value={selectedExamKind} options={examKindOptions} onChange={onExamKindChange} />
          ) : null}
        </div>
        <div className="actions">
          <button className="icon-text-button" type="button" onClick={onExport} disabled={isLoading} title="Export image">
            <Download size={18} />
            Export image
          </button>
        </div>
      </section>

      {children}
      <AppFooter />
    </main>
  );
}
