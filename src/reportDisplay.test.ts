import { describe, expect, it } from 'vitest';
import {
  examKindLabel,
  formatExamDateLabel,
  formatSemesterLabel,
  normalizeTitleCardStudent,
  studyDayLabel,
} from './reportDisplay';

describe('report display helpers', () => {
  it('formats study day labels as English short names and Thai full names', () => {
    expect(studyDayLabel('Mon')).toEqual({ key: 'Mon', short: 'Mon', full: 'จันทร์' });
    expect(studyDayLabel('จ.')).toEqual({ key: 'Mon', short: 'Mon', full: 'จันทร์' });
  });

  it('formats exam date labels with Thai date and weekday', () => {
    expect(formatExamDateLabel('2026-03-16')).toEqual({ date: '16 มี.ค. 2569', day: 'จันทร์' });
    expect(formatExamDateLabel('จ. 16 มี.ค. 26')).toEqual({ date: '16 มี.ค. 2569', day: 'จันทร์' });
  });

  it('formats title card semester and exam kind in Thai', () => {
    expect(formatSemesterLabel('2/2568')).toBe('ประจำภาคเรียนที่ 2 ปีการศึกษา 2568');
    expect(examKindLabel('final')).toBe('(ปลายภาค)');
    expect(examKindLabel('midterm')).toBe('(กลางภาค)');
  });

  it('normalizes legacy English title-card identity fields to Thai for display', () => {
    expect(normalizeTitleCardStudent({
      id: '67010388',
      name: 'Mr.Thanathorn Thepsumrung',
      semester: '2/2568',
      university: "King Mongkut's Institute of Technology Ladkrabang",
      faculty: 'Faculty of Engineering',
      department: 'Bachelor of Engineering Programme in Electrical Engineering',
      raw: 'ID: 67010388 Name: Mr.Thanathorn Thepsumrung นายธนธรณ์ เทพสำเริง Department: --> Major: Bachelor of Engineering Programme in Electrical Engineering Semester/Year : 2/2568',
    })).toMatchObject({
      university: 'สถาบันเทคโนโลยีพระจอมเกล้าเจ้าคุณทหารลาดกระบัง',
      faculty: 'คณะวิศวกรรมศาสตร์',
      department: 'ภาควิชา วิศวกรรมไฟฟ้า สาขาวิชา วิศวกรรมไฟฟ้า',
      name: 'นายธนธรณ์ เทพสำเริง',
    });
  });
});
