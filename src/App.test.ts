import { describe, expect, it } from 'vitest';
import {
  applyTitleIdentityToReports,
  clearReportForTab,
  getReportLoadParams,
  getSelectionChangeState,
  titleIdentityFromReport,
} from './App';
import type { ReportData } from './types';

const studyReport = {
  type: 'study',
  student: {
    id: '65080000',
    name: 'Friend Account',
    semester: '1/2568',
    faculty: 'คณะเทคโนโลยีสารสนเทศ',
    department: 'สาขาวิชา วิศวกรรมแปรรูปอาหาร',
  },
  courses: [],
} satisfies ReportData;

const gradeReport = {
  type: 'grade',
  student: {
    id: '65080000',
    name: 'Friend Account',
    semester: '1/2568',
    faculty: '',
    department: '',
  },
  courses: [],
  summary: [],
} satisfies ReportData;

describe('getSelectionChangeState', () => {
  it('drops the stale semester when changing academic year', () => {
    expect(getSelectionChangeState(
      { semester: '3', year: '2567', examKind: 'final' },
      { year: '2568' },
    )).toEqual({
      nextSelected: { semester: '', year: '2568', examKind: 'final' },
      reportParams: { year: '2568', examKind: 'final' },
      resetSemesterOptions: true,
    });
  });

  it('keeps the current year when only changing semester', () => {
    expect(getSelectionChangeState(
      { semester: '1', year: '2568', examKind: 'final' },
      { semester: '2' },
    )).toEqual({
      nextSelected: { semester: '2', year: '2568', examKind: 'final' },
      reportParams: { semester: '2', year: '2568', examKind: 'final' },
      resetSemesterOptions: false,
    });
  });
});

describe('getReportLoadParams', () => {
  it('does not carry selected year and semester into a default tab load', () => {
    expect(getReportLoadParams({
      semester: '2',
      year: '2568',
      examKind: 'final',
    })).toEqual({});
  });

  it('uses explicit params for selection-driven reloads', () => {
    expect(getReportLoadParams(
      { semester: '2', year: '2568', examKind: 'final' },
      { semester: '1', year: '2567' },
    )).toEqual({ semester: '1', year: '2567' });
  });
});

describe('title identity loading', () => {
  it('extracts only the report profile identity used by title cards', () => {
    expect(titleIdentityFromReport(studyReport)).toEqual({
      faculty: 'คณะเทคโนโลยีสารสนเทศ',
      department: 'สาขาวิชา วิศวกรรมแปรรูปอาหาร',
    });
  });

  it('applies blank profile identity to every cached report when profile is unavailable', () => {
    const reports = applyTitleIdentityToReports({
      study: studyReport,
      grade: gradeReport,
    }, titleIdentityFromReport(gradeReport));

    expect(reports.study?.student).toMatchObject({ faculty: '', department: '' });
    expect(reports.grade?.student).toMatchObject({ faculty: '', department: '' });
  });

  it('applies loaded profile identity to every cached report', () => {
    const reports = applyTitleIdentityToReports({
      study: gradeReport,
      grade: gradeReport,
    }, titleIdentityFromReport(studyReport));

    expect(reports.study?.student).toMatchObject({
      faculty: 'คณะเทคโนโลยีสารสนเทศ',
      department: 'สาขาวิชา วิศวกรรมแปรรูปอาหาร',
    });
    expect(reports.grade?.student).toMatchObject({
      faculty: 'คณะเทคโนโลยีสารสนเทศ',
      department: 'สาขาวิชา วิศวกรรมแปรรูปอาหาร',
    });
  });
});

describe('tab report loading', () => {
  it('clears the target tab report before reloading so stale tables are not shown', () => {
    expect(clearReportForTab({
      study: studyReport,
      grade: gradeReport,
    }, 'grade')).toEqual({
      study: studyReport,
      grade: undefined,
    });
  });
});
