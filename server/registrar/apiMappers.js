const DAY_NAMES = {
  1: 'Sun',
  2: 'Mon',
  3: 'Tue',
  4: 'Wed',
  5: 'Thu',
  6: 'Fri',
  7: 'Sat',
};

const FACULTY_NAMES_TH = {
  '01': 'คณะวิศวกรรมศาสตร์',
  '02': 'คณะสถาปัตยกรรม ศิลปะและการออกแบบ',
  '03': 'คณะครุศาสตร์อุตสาหกรรมและเทคโนโลยี',
  '04': 'คณะวิทยาศาสตร์',
  '05': 'คณะเทคโนโลยีการเกษตร',
  '06': 'คณะเทคโนโลยีสารสนเทศ',
  '07': 'คณะอุตสาหกรรมอาหาร',
  '08': 'วิทยาลัยนานาชาติ',
  '09': 'คณะบริหารธุรกิจ',
  '10': 'คณะศิลปศาสตร์',
  '11': 'วิทยาลัยเทคโนโลยีและนวัตกรรมวัสดุ',
  '12': 'วิทยาลัยนวัตกรรมการผลิตขั้นสูง',
  '13': 'คณะแพทยศาสตร์',
  '14': 'วิทยาลัยวิศวกรรมสังคีต',
  '15': 'คณะทันตแพทยศาสตร์',
};

function isPracticeType(value) {
  return value === 'ป' || value === 'Practice';
}

function timeToMinutes(value) {
  const match = String(value ?? '').match(/^(\d{1,2}):(\d{2})/);
  if (!match) return 0;
  return Number(match[1]) * 60 + Number(match[2]);
}

function formatTime(value) {
  const match = String(value ?? '').match(/^(\d{1,2}):(\d{2})/);
  if (!match) return '';
  return `${String(Number(match[1])).padStart(2, '0')}:${match[2]}`;
}

function validTimeRange(start, end) {
  return formatTime(start) && formatTime(end) && formatTime(start) !== '00:00' && formatTime(end) !== '00:00';
}

function isValidDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value ?? '')) && value !== '0000-00-00';
}

function makeStudent(userInfo, year, semester) {
  const ticket = userInfo?.payload?.ticket ?? {};
  const thaiName = [userInfo?.fname_th, userInfo?.lname_th].filter(Boolean).join(' ');
  const englishName = [userInfo?.fname_en, userInfo?.lname_en].filter(Boolean).join(' ');
  const facultyId = String(userInfo?.faculty_id ?? '').padStart(2, '0');
  return {
    id: ticket.user_id ?? ticket.email ?? '',
    name: thaiName || englishName,
    faculty: FACULTY_NAMES_TH[facultyId] ?? '',
    semester: semester && year ? `${semester}/${year}` : '',
    raw: '',
  };
}

function makeOptions(values, selectedValue) {
  return values.map((value) => ({
    value: String(value),
    label: String(value),
    selected: String(value) === String(selectedValue),
  }));
}

export function buildAcademicOptions(year, semester, options = {}) {
  const currentYear = Number(options.currentYear ?? year) || new Date().getFullYear() + 543;
  const years = options.years?.length ? options.years : [currentYear, currentYear - 1, currentYear - 2];
  const semesters = options.semesters?.length ? options.semesters : ['1', '2', '3'];
  return {
    years: makeOptions(years, year || years[0] || currentYear),
    semesters: makeOptions(semesters, semester || semesters[0] || '1'),
    examKinds: [
      { value: 'final', label: 'Final', selected: true },
      { value: 'midterm', label: 'Midterm', selected: false },
    ],
  };
}

function addSlot(slots, day, start, end, type) {
  if (!DAY_NAMES[day] || !validTimeRange(start, end)) return;
  slots.push({
    day: DAY_NAMES[day],
    start: formatTime(start),
    end: formatTime(end),
    startMinutes: timeToMinutes(start),
    endMinutes: timeToMinutes(end),
    type,
    isPractice: isPracticeType(type),
    room: '',
  });
}

function slotsFromRow(row) {
  const slots = [];
  addSlot(slots, Number(row.teach_day), row.teach_time, row.teach_time2, row.lect_or_prac ?? '');

  for (const raw of String(row.teachtime_str ?? '').split(',')) {
    const match = raw.trim().match(/^(\d+)x(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/);
    if (match) addSlot(slots, Number(match[1]), match[2], match[3], row.lect_or_prac ?? '');
  }

  return slots;
}

function mergeCourseSlots(slots) {
  const slotsByDay = new Map();
  for (const slot of slots) {
    if (!slotsByDay.has(slot.day)) slotsByDay.set(slot.day, []);
    slotsByDay.get(slot.day).push(slot);
  }

  const merged = [];
  for (const daySlots of slotsByDay.values()) {
    const sorted = [...daySlots].sort((a, b) => a.startMinutes - b.startMinutes);
    let current = { ...sorted[0] };
    for (const next of sorted.slice(1)) {
      const gap = next.startMinutes - current.endMinutes;
      if (gap <= 30 && next.isPractice === current.isPractice && next.room === current.room) {
        current.end = next.end;
        current.endMinutes = next.endMinutes;
      } else {
        merged.push(current);
        current = { ...next };
      }
    }
    if (current) merged.push(current);
  }

  return merged.sort((a, b) => a.startMinutes - b.startMinutes);
}

export function mapRegistrationStudyReport(rows, { userInfo, year, semester }) {
  const coursesByCode = new Map();

  for (const row of rows) {
    const code = String(row.subject_id ?? '');
    if (!code) continue;

    if (!coursesByCode.has(code)) {
      coursesByCode.set(code, {
        code,
        name: row.subject_ename || row.subject_tname || code,
        credits: `${row.credit ?? ''}${row.lect_hr || row.prac_hr || row.self_hr ? ` (${row.lect_hr ?? 0}-${row.prac_hr ?? 0}-${row.self_hr ?? 0})` : ''}`,
        theorySection: '',
        practiceSection: '',
        building: '',
        slots: [],
      });
    }

    const course = coursesByCode.get(code);
    if (row.lect_or_prac === 'ป') course.practiceSection = row.section ?? '';
    else course.theorySection = row.section ?? '';
    course.slots.push(...slotsFromRow(row));
  }

  return {
    type: 'study',
    student: makeStudent(userInfo, year, semester),
    courses: [...coursesByCode.values()].map((course) => ({
      ...course,
      practiceSection: course.practiceSection || '-',
      slots: mergeCourseSlots(course.slots),
    })),
  };
}

function dateSortKey(value) {
  if (!isValidDate(value)) return 0;
  return Number(String(value).replaceAll('-', ''));
}

function examFromRow(row, kind) {
  const isMidterm = kind === 'midterm';
  const date = isMidterm ? row.mexam_date : row.exam_date;
  const start = isMidterm ? row.mexam_time : row.exam_time;
  const end = isMidterm ? row.mexam_time2 : row.exam_time2;
  const hasSchedule = isValidDate(date) && validTimeRange(start, end);

  return {
    code: String(row.subject_id ?? ''),
    name: row.subject_ename || row.subject_tname || row.subject_id || '',
    section: String(row.section ?? ''),
    type: isPracticeType(row.lect_or_prac) ? 'ปฏิบัติ' : 'ทฤษฎี',
    dateRaw: hasSchedule ? String(date) : '-',
    start: hasSchedule ? formatTime(start) : '',
    end: hasSchedule ? formatTime(end) : '',
    startMinutes: hasSchedule ? timeToMinutes(start) : 0,
    endMinutes: hasSchedule ? timeToMinutes(end) : 0,
    sortKey: dateSortKey(date),
    location: '',
    isTba: !hasSchedule,
  };
}

export function mapRegistrationExamReport(rows, { userInfo, year, semester, examKind = 'final' }) {
  const seen = new Set();
  const exams = [];

  for (const row of rows) {
    const exam = examFromRow(row, examKind);
    if (!exam.code) continue;
    const key = [exam.code, exam.dateRaw, exam.start, exam.end].join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    exams.push(exam);
  }

  return {
    type: 'exam',
    student: makeStudent(userInfo, year, semester),
    exams,
  };
}
