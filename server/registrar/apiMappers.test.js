import { describe, expect, it } from 'vitest';
import {
  buildAcademicOptions,
  mapRegistrationExamReport,
  mapRegistrationStudyReport,
} from './apiMappers.js';

const userInfo = {
  payload: { ticket: { user_id: '67010388' } },
  faculty_id: '01',
  fname_th: 'à¸˜à¸™à¸˜à¸£à¸“à¹Œ',
  lname_th: 'à¹€à¸—à¸žà¸ªà¸³à¹€à¸£à¸´à¸‡',
  fname_en: 'NOVA',
  lname_en: 'TEST',
};

const registrationRows = [
  {
    subject_id: '01006051',
    section: '102',
    lect_or_prac: 'ป',
    teach_day: '7',
    teach_time: '13:00:00',
    teach_time2: '15:00:00',
    teachtime_str: '',
    mexam_date: '0000-00-00',
    mexam_time: '00:00:00',
    mexam_time2: '00:00:00',
    exam_date: '0000-00-00',
    exam_time: '00:00:00',
    exam_time2: '00:00:00',
    sec_pair: '2',
    subject_ename: 'DRAWING AND COMPUTER AIDED DRAWING FOR ENGINEERING',
    credit: '3',
    lect_hr: '2',
    prac_hr: '2',
    self_hr: '5',
  },
  {
    subject_id: '01006051',
    section: '2',
    lect_or_prac: 'ท',
    teach_day: '2',
    teach_time: '13:00:00',
    teach_time2: '15:00:00',
    teachtime_str: '',
    mexam_date: '2025-08-27',
    mexam_time: '09:30:00',
    mexam_time2: '12:30:00',
    exam_date: '2025-10-22',
    exam_time: '09:30:00',
    exam_time2: '12:30:00',
    sec_pair: '102',
    subject_ename: 'DRAWING AND COMPUTER AIDED DRAWING FOR ENGINEERING',
    credit: '3',
    lect_hr: '2',
    prac_hr: '2',
    self_hr: '5',
  },
  {
    subject_id: '01026206',
    section: '2',
    lect_or_prac: 'ท',
    teach_day: '5',
    teach_time: '13:00:00',
    teach_time2: '14:30:00',
    teachtime_str: '5x14:45-16:15',
    mexam_date: '2025-08-26',
    mexam_time: '09:30:00',
    mexam_time2: '12:30:00',
    exam_date: '2025-10-21',
    exam_time: '09:30:00',
    exam_time2: '12:30:00',
    sec_pair: null,
    subject_ename: 'ELECTROMAGNETIC FIELDS',
    credit: '3',
    lect_hr: '3',
    prac_hr: '0',
    self_hr: '6',
  },
];

describe('registrar API mappers', () => {
  it('groups registration rows into study courses and weekly slots', () => {
    const report = mapRegistrationStudyReport(registrationRows, { userInfo, year: '2568', semester: '1' });

    expect(report.student).toMatchObject({
      id: '67010388',
      name: 'à¸˜à¸™à¸˜à¸£à¸“à¹Œ à¹€à¸—à¸žà¸ªà¸³à¹€à¸£à¸´à¸‡',
      faculty: 'คณะวิศวกรรมศาสตร์',
      semester: '1/2568',
    });
    expect(report.courses).toHaveLength(2);
    expect(report.courses[0]).toMatchObject({
      code: '01006051',
      theorySection: '2',
      practiceSection: '102',
    });
    expect(report.courses[0].slots).toEqual([
      expect.objectContaining({ day: 'Sat', start: '13:00', end: '15:00', isPractice: true }),
      expect.objectContaining({ day: 'Mon', start: '13:00', end: '15:00', isPractice: false }),
    ]);
    expect(report.courses[1].slots).toEqual([
      expect.objectContaining({ day: 'Thu', start: '13:00', end: '16:15' }),
    ]);
  });

  it('maps registration rows into final and midterm exam reports', () => {
    const finalReport = mapRegistrationExamReport(registrationRows, {
      userInfo,
      year: '2568',
      semester: '1',
      examKind: 'final',
    });
    const midtermReport = mapRegistrationExamReport(registrationRows, {
      userInfo,
      year: '2568',
      semester: '1',
      examKind: 'midterm',
    });

    expect(finalReport.exams).toEqual([
      expect.objectContaining({ code: '01006051', dateRaw: '-', isTba: true, type: 'ปฏิบัติ' }),
      expect.objectContaining({ code: '01006051', dateRaw: '2025-10-22', start: '09:30', end: '12:30', type: 'ทฤษฎี' }),
      expect.objectContaining({ code: '01026206', dateRaw: '2025-10-21', start: '09:30', end: '12:30', type: 'ทฤษฎี' }),
    ]);
    expect(midtermReport.exams).toEqual([
      expect.objectContaining({ code: '01006051', dateRaw: '-', isTba: true }),
      expect.objectContaining({ code: '01006051', dateRaw: '2025-08-27' }),
      expect.objectContaining({ code: '01026206', dateRaw: '2025-08-26' }),
    ]);
  });

  it('builds stable academic options from the registrar current year and available semesters', () => {
    const options = buildAcademicOptions('2567', '2', {
      currentYear: '2568',
      semesters: ['1', '2'],
    });

    expect(options.years[0]).toEqual({ value: '2568', label: '2568', selected: false });
    expect(options.years.find((option) => option.value === '2567')).toMatchObject({ selected: true });
    expect(options.semesters).toEqual([
      { value: '1', label: '1', selected: false },
      { value: '2', label: '2', selected: true },
    ]);
    expect(options.examKinds).toHaveLength(2);
  });
});
