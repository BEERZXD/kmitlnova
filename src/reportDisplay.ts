import type { ApiOption, StudentInfo } from './types';

export const UNIVERSITY_TH = 'สถาบันเทคโนโลยีพระจอมเกล้าเจ้าคุณทหารลาดกระบัง';
const FACULTY_FOOD_TH = '\u0e04\u0e13\u0e30 \u0e2d\u0e38\u0e15\u0e2a\u0e32\u0e2b\u0e01\u0e23\u0e23\u0e21\u0e2d\u0e32\u0e2b\u0e32\u0e23';
const FOOD_PROCESS_MAJOR_TH = '\u0e2a\u0e32\u0e02\u0e32\u0e27\u0e34\u0e0a\u0e32 \u0e27\u0e34\u0e28\u0e27\u0e01\u0e23\u0e23\u0e21\u0e41\u0e1b\u0e23\u0e23\u0e39\u0e1b\u0e2d\u0e32\u0e2b\u0e32\u0e23';

export const subjectPalette = [
  ['#3b82f6', '#eff6ff', '#1e3a8a'],
  ['#10b981', '#ecfdf5', '#064e3b'],
  ['#8b5cf6', '#f5f3ff', '#4c1d95'],
  ['#f43f5e', '#fff1f2', '#881337'],
  ['#f59e0b', '#fffbeb', '#78350f'],
  ['#6366f1', '#eef2ff', '#312e81'],
  ['#14b8a6', '#f0fdfa', '#134e4a'],
  ['#ec4899', '#fdf2f8', '#831843'],
  ['#06b6d4', '#ecfeff', '#164e63'],
  ['#f97316', '#fff7ed', '#7c2d12'],
  ['#84cc16', '#f7fee7', '#365314'],
  ['#d946ef', '#fdf4ff', '#701a75'],
  ['#0ea5e9', '#f0f9ff', '#0c4a6e'],
  ['#22c55e', '#f0fdf4', '#14532d'],
  ['#a855f7', '#faf5ff', '#581c87'],
  ['#64748b', '#f8fafc', '#0f172a'],
] as const;

const studyDays: Record<string, { key: string; short: string; full: string }> = {
  Mon: { key: 'Mon', short: 'Mon', full: 'จันทร์' },
  Tue: { key: 'Tue', short: 'Tue', full: 'อังคาร' },
  Wed: { key: 'Wed', short: 'Wed', full: 'พุธ' },
  Thu: { key: 'Thu', short: 'Thu', full: 'พฤหัสบดี' },
  Fri: { key: 'Fri', short: 'Fri', full: 'ศุกร์' },
  Sat: { key: 'Sat', short: 'Sat', full: 'เสาร์' },
  Sun: { key: 'Sun', short: 'Sun', full: 'อาทิตย์' },
  'จ.': { key: 'Mon', short: 'Mon', full: 'จันทร์' },
  'อ.': { key: 'Tue', short: 'Tue', full: 'อังคาร' },
  'พ.': { key: 'Wed', short: 'Wed', full: 'พุธ' },
  'พฤ.': { key: 'Thu', short: 'Thu', full: 'พฤหัสบดี' },
  'ศ.': { key: 'Fri', short: 'Fri', full: 'ศุกร์' },
  'ส.': { key: 'Sat', short: 'Sat', full: 'เสาร์' },
  'อา.': { key: 'Sun', short: 'Sun', full: 'อาทิตย์' },
  'à¸ˆ.': { key: 'Mon', short: 'Mon', full: 'จันทร์' },
  'à¸­.': { key: 'Tue', short: 'Tue', full: 'อังคาร' },
  'à¸ž.': { key: 'Wed', short: 'Wed', full: 'พุธ' },
  'à¸žà¸¤.': { key: 'Thu', short: 'Thu', full: 'พฤหัสบดี' },
  'à¸¨.': { key: 'Fri', short: 'Fri', full: 'ศุกร์' },
  'à¸ª.': { key: 'Sat', short: 'Sat', full: 'เสาร์' },
  'à¸­à¸².': { key: 'Sun', short: 'Sun', full: 'อาทิตย์' },
};

const thaiDayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
const thaiDayAbbrev: Record<string, string> = {
  'อา.': 'อาทิตย์',
  'จ.': 'จันทร์',
  'อ.': 'อังคาร',
  'พ.': 'พุธ',
  'พฤ.': 'พฤหัสบดี',
  'ศ.': 'ศุกร์',
  'ส.': 'เสาร์',
};
const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

export const studyDayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TH_MAJOR_LABEL = '\u0e2a\u0e32\u0e02\u0e32\u0e27\u0e34\u0e0a\u0e32';

export function studyDayLabel(value: string) {
  return studyDays[value] ?? { key: value, short: value, full: value };
}

export function formatSemesterLabel(value?: string) {
  const match = String(value ?? '').match(/(\d+)\/(\d{4})/);
  if (!match) return value || 'Selected semester';
  return `ประจำภาคเรียนที่ ${match[1]} ปีการศึกษา ${match[2]}`;
}

function thaiText(value?: string) {
  return String(value ?? '')
    .replace(/^[^\u0e00-\u0e7f]+/, '')
    .trim();
}

function titleCardUniversity(value?: string) {
  const text = String(value ?? '').trim();
  if (!text || /King Mongkut's Institute of Technology Ladkrabang/i.test(text)) return UNIVERSITY_TH;
  return text;
}

function titleCardFaculty(value?: string) {
  const text = String(value ?? '').trim();
  if (!/[\u0e00-\u0e7f]/.test(text)) return '';
  
  const facultyMatch = text.match(/^คณะ\s*(.+)$/);
  if (!facultyMatch) return text;
  return `คณะ ${facultyMatch[1].trim()}`;
}

function titleCardDepartment(value?: string) {
  const text = String(value ?? '').trim();
  if (!/[\u0e00-\u0e7f]/.test(text)) return '';
  const majorMatch = text.match(new RegExp(`${TH_MAJOR_LABEL}\\s*(.+)$`));
  if (!majorMatch) return text;
  return `${TH_MAJOR_LABEL} ${majorMatch[1].trim()}`;
}

function titleCardName(student: StudentInfo) {
  const rawName = String(student.name ?? '').trim();
  const rawThaiName = thaiText(student.raw?.match(/Name:\s*([^]+?)(?:Department:|Semester\/Year:|$)/)?.[1]);
  return rawThaiName || thaiText(rawName) || rawName;
}

export function normalizeTitleCardStudent(student: StudentInfo): StudentInfo {
  const department = titleCardDepartment(student.department);
  const faculty = titleCardFaculty(student.faculty);
  const hasKnownMismatch = department === FOOD_PROCESS_MAJOR_TH && faculty !== FACULTY_FOOD_TH;

  return {
    ...student,
    name: titleCardName(student),
    university: titleCardUniversity(student.university),
    faculty: hasKnownMismatch ? '' : faculty,
    department: hasKnownMismatch ? '' : department,
  };
}

export function examKindLabel(value?: string) {
  if (value === 'midterm' || value === '1') return '(กลางภาค)';
  if (value === 'final' || value === '2') return '(ปลายภาค)';
  return value || '';
}

export function selectedExamKind(options?: ApiOption[]) {
  return options?.find((option) => option.selected)?.value ?? '';
}

export function formatExamDateLabel(dateRaw: string) {
  const iso = dateRaw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    const date = new Date(year, month - 1, day);
    return {
      date: `${day} ${thaiMonths[month - 1]} ${year + 543}`,
      day: thaiDayNames[date.getDay()],
    };
  }

  const thai = dateRaw.match(/^(อา\.|จ\.|อ\.|พ\.|พฤ\.|ศ\.|ส\.)\s*(\d{1,2})\s+(\S+)\s+(\d{2,4})$/);
  if (thai) {
    const year = Number(thai[4]);
    return {
      date: `${Number(thai[2])} ${thai[3]} ${year < 100 ? year + 2543 : year}`,
      day: thaiDayAbbrev[thai[1]] ?? thai[1],
    };
  }

  return { date: dateRaw, day: '' };
}
