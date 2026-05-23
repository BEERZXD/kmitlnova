const TH_MONTHS = {
  'ม.ค.': 1,
  'ก.พ.': 2,
  'มี.ค.': 3,
  'เม.ย.': 4,
  'พ.ค.': 5,
  'มิ.ย.': 6,
  'ก.ค.': 7,
  'ส.ค.': 8,
  'ก.ย.': 9,
  'ต.ค.': 10,
  'พ.ย.': 11,
  'ธ.ค.': 12,
  'à¸¡.à¸„.': 1,
  'à¸.à¸ž.': 2,
  'à¸¡à¸µ.à¸„.': 3,
  'à¹€à¸¡.à¸¢.': 4,
  'à¸ž.à¸„.': 5,
  'à¸¡à¸´.à¸¢.': 6,
  'à¸.à¸„.': 7,
  'à¸ª.à¸„.': 8,
  'à¸.à¸¢.': 9,
  'à¸•.à¸„.': 10,
  'à¸ž.à¸¢.': 11,
  'à¸˜.à¸„.': 12,
};

const TH_DAY_RE = 'จ\\.|อ\\.|พ\\.|พฤ\\.|ศ\\.|ส\\.|อา\\.|à¸ˆ\\.|à¸­\\.|à¸ž\\.|à¸žà¸¤\\.|à¸¨\\.|à¸ª\\.|à¸­à¸²\\.';
const UNIVERSITY_TH = 'สถาบันเทคโนโลยีพระจอมเกล้าเจ้าคุณทหารลาดกระบัง';

const FACULTY_TRANSLATIONS = [
  [/^Faculty of Engineering$/i, 'คณะวิศวกรรมศาสตร์'],
];

const DEPARTMENT_TRANSLATIONS = [
  [/^Bachelor of Engineering Programme in Electrical Engineering$/i, 'ภาควิชา วิศวกรรมไฟฟ้า สาขาวิชา วิศวกรรมไฟฟ้า'],
];

function decodeEntities(value) {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function normalizeText(value) {
  return value.replace(/\u00a0/g, ' ').replace(/\r/g, '').replace(/[ \t\f\v]+/g, ' ').replace(/\n\s+/g, '\n').trim();
}

function stripTags(value) {
  return normalizeText(decodeEntities(value.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' ')));
}

function getRows(html) {
  return [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((match) => match[1]);
}

function getCells(rowHtml) {
  return [...rowHtml.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((match) => ({
    html: match[1],
    text: stripTags(match[1]),
    lines: match[1]
      .split(/<br\s*\/?>/gi)
      .map(stripTags)
      .filter(Boolean),
  }));
}

function dataCells(rowHtml) {
  return getCells(rowHtml).filter((cell) => cell.text);
}

function parseTimeRange(raw) {
  const match = raw.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
  if (!match) return null;

  const startH = Number(match[1]);
  const startM = Number(match[2]);
  const endH = Number(match[3]);
  const endM = Number(match[4]);

  return {
    start: `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`,
    end: `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`,
    startMinutes: startH * 60 + startM,
    endMinutes: endH * 60 + endM,
  };
}

function isPracticeType(value) {
  return value === 'ป' || value === 'ปฏิบัติ' || value === 'à¸›' || value === 'Practice';
}

function normalizeClassType(value) {
  if (isPracticeType(value)) return 'ปฏิบัติ';
  if (value === 'ท' || value === 'ทฤษฎี' || value === 'à¸—' || value === 'Lecture') return 'ทฤษฎี';
  return value;
}

function parseStudySlot(raw, room = '') {
  const match = raw.trim().match(new RegExp(`^(${TH_DAY_RE})\\s*(.+)$`));
  if (!match) return null;

  const time = parseTimeRange(match[2]);
  if (!time) return null;

  const typeMatch = raw.match(/\((ท|ป|à¸—|à¸›)\)/);
  const type = typeMatch?.[1] ?? '';

  return {
    day: match[1],
    ...time,
    type,
    isPractice: isPracticeType(type),
    room,
  };
}

function studySlotTexts(cell) {
  const pattern = new RegExp(`(${TH_DAY_RE})\\s*\\d{1,2}:\\d{2}\\s*-\\s*\\d{1,2}:\\d{2}(?:\\s*น\\.)?\\s*\\((?:ท|ป|à¸—|à¸›)\\)`, 'g');
  const text = cell.text.replace(/\+/g, ' ');
  const matches = [...text.matchAll(pattern)].map((match) => match[0].trim());
  return matches.length ? matches : (cell.lines.length ? cell.lines : text.split('\n')).map((line) => line.replace(/\+$/, '').trim()).filter(Boolean);
}

function parseStudentInfo(html) {
  const text = stripTags(html);
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  const semesterMatch = text.match(/ประจำภาคเรียนที่\s*(\d+)\s*ปีการศึกษา\s*(\d+)/)
    ?? text.match(/(?:à¸›à¸£à¸°à¸ˆà¸³à¸ à¸²à¸„à¹€à¸£à¸µà¸¢à¸™à¸—à¸µà¹ˆ|Semester\/Year\s*:?)\s*([0-9/]+)/)
    ?? text.match(/(\d+\/\d{4})/);
  const semester = semesterMatch?.[2] ? `${semesterMatch[1]}/${semesterMatch[2]}` : semesterMatch?.[1] ?? '';
  const id = text.match(/(?:รหัสนักศึกษา|à¸£à¸«à¸±à¸ªà¸™à¸±à¸à¸¨à¸¶à¸à¸©à¸²|ID\s*:?)\s*(\d+)/)?.[1] ?? '';
  const nameField = text.match(/Name:\s*([^]+?)(?:Department:|Semester\/Year:|$)/)?.[1] ?? '';
  const thaiName = text.match(/ชื่อ\s*([^\n]+)/)?.[1]?.trim() ?? thaiText(nameField);
  const englishName = cleanEnglishName(nameField);
  const university = lines.find((line) => line.includes('สถาบัน') || line.includes('พระจอมเกล้า') || line.includes("King Mongkut's")) ?? '';
  const faculty = lines.find((line) => /^(คณะ|Faculty of|College of|School of|Academy of)/i.test(line.replace(/\s+/g, ' ').trim())) ?? '';
  const departmentLine = lines.find((line) => line.includes('ภาควิชา') || line.includes('Major:'))?.replace(/\s+/g, ' ').trim() ?? '';
  const department = departmentLine
    .replace(/^Department:\s*-+>\s*/i, '')
    .replace(/^Major:\s*/i, '')
    .replace(/\s*Semester\/Year\s*:.*$/i, '')
    .trim();

  return {
    id,
    name: thaiName || englishName,
    semester,
    university: normalizeUniversity(university),
    faculty: normalizeFaculty(faculty),
    department: normalizeDepartment(department),
    raw: text,
  };
}

function thaiText(value) {
  return normalizeText(value)
    .replace(/^[^\u0e00-\u0e7f]+/, '')
    .trim();
}

function translateKnownValue(value, translations) {
  const normalized = normalizeText(value);
  const match = translations.find(([pattern]) => pattern.test(normalized));
  return match?.[1] ?? normalized;
}

function normalizeUniversity(value) {
  const normalized = normalizeText(value);
  if (!normalized || normalized.includes("King Mongkut's") || normalized.includes('พระจอมเกล้า')) return UNIVERSITY_TH;
  return normalized;
}

function normalizeFaculty(value) {
  const normalized = normalizeText(value).replace(/^คณะ\s+/, 'คณะ');
  return translateKnownValue(normalized, FACULTY_TRANSLATIONS);
}

function normalizeDepartment(value) {
  return translateKnownValue(value, DEPARTMENT_TRANSLATIONS);
}

function cleanEnglishName(value) {
  return normalizeText(value)
    .replace(/[\u0e00-\u0e7f].*$/, '')
    .replace(/\s+(?:à¸|à¹|Ã).+$/, '')
    .trim();
}

function mergeStudySlots(slots) {
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

export function parseStudyReport(html) {
  const rows = getRows(html);
  const courses = [];

  for (const row of rows) {
    const cells = dataCells(row);
    if (cells.length < 8) continue;

    const code = cells[1]?.text ?? '';
    if (!/^\d{8}$/.test(code)) continue;

    const timeLines = cells[6] ? studySlotTexts(cells[6]) : [];
    const hasRoomColumns = cells.length >= 9;
    const roomLines = hasRoomColumns ? (cells[7]?.lines.length ? cells[7].lines : cells[7]?.text.split('\n') ?? []) : [];
    const slots = timeLines
      .map((line, index) => parseStudySlot(line.replace(/\+$/, '').trim(), roomLines[index] ?? roomLines[0] ?? ''))
      .filter(Boolean);

    courses.push({
      code,
      name: cells[2]?.text ?? '',
      credits: cells[3]?.text ?? '',
      theorySection: cells[4]?.text ?? '',
      practiceSection: cells[5]?.text ?? '',
      building: hasRoomColumns ? cells[8]?.text ?? '' : '',
      slots: mergeStudySlots(slots),
    });
  }

  return {
    student: parseStudentInfo(html),
    courses: courses.map((course) => ({
      ...course,
      practiceSection: course.practiceSection || '-',
    })),
  };
}

function parseThaiDateSortKey(dateRaw) {
  const parts = dateRaw.split(/\s+/);
  if (parts.length < 4) return 0;
  const day = Number(parts[1]);
  const month = TH_MONTHS[parts[2]] ?? 0;
  const shortYear = Number(parts[3]);
  const year = shortYear < 100 ? 2500 + shortYear : shortYear;
  return year * 10000 + month * 100 + day;
}

const FINAL_EXAM_LOCATION_TH = 'สอบในช่วงสอบปลายภาค (ในห้องสอบ)';
const FINAL_EXAM_LOCATION_MOJIBAKE = 'à¸ªà¸­à¸šà¹ƒà¸™à¸Šà¹ˆà¸§à¸‡à¸ªà¸­à¸šà¸›à¸¥à¸²à¸¢à¸ à¸²à¸„ (à¹ƒà¸™à¸«à¹‰à¸­à¸‡à¸ªà¸­à¸š)';
const FINAL_EXAM_LOCATION_EN = 'Examination during the final exam (in the examination room)';

function genericFinalExamLocation(value) {
  const text = String(value ?? '');
  if (text.includes(FINAL_EXAM_LOCATION_TH)) return FINAL_EXAM_LOCATION_TH;
  if (text.includes(FINAL_EXAM_LOCATION_MOJIBAKE)) return FINAL_EXAM_LOCATION_MOJIBAKE;
  return '';
}

function cleanExamLocation(value) {
  const cleaned = String(value ?? '')
    .replace(/\|/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned || cleaned === '-') return cleaned;

  const genericFinal = genericFinalExamLocation(cleaned);
  if (genericFinal) return genericFinal;

  const room = cleaned.match(/\b[A-Z]{1,4}\d{0,2}-\d{2,4}\b/i)?.[0];
  const labeledBuilding = cleaned.match(/(?:อาคาร|ตึก|Building|Bldg)\s*:?\s*([A-Z]{1,4}\d{0,2})/i)?.[1];
  const labeledRoom = cleaned.match(/(?:ห้องสอบ|ห้อง|Room)\s*:?\s*(\d{2,4})/i)?.[1];
  const seat = cleaned.match(/(?:ที่นั่งสอบ|ที่นั่ง|Seat)\s*:?\s*([A-Z]\d+)/i)?.[1]
    ?? cleaned.match(/\(([A-Z]\d+)\)/i)?.[1]
    ?? cleaned.match(/:\s*([A-Z]\d+)\s*$/i)?.[1];
  const roomCode = room ?? (labeledBuilding && labeledRoom ? `${labeledBuilding}-${labeledRoom}` : '');

  if (roomCode && seat) return `${roomCode.toUpperCase()} (${seat.toUpperCase()})`;
  if (roomCode) return roomCode.toUpperCase();

  return cleaned
    .replace(new RegExp(FINAL_EXAM_LOCATION_EN.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '')
    .replace(/^ห้อง\s*:\s*/i, '')
    .replace(/^à¸«à¹‰à¸­à¸‡\s*:\s*/i, '')
    .replace(/^à¸«à¹‰à¸­à¸‡:/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseExamReport(html) {
  const rows = getRows(html);
  const exams = [];

  for (const row of rows) {
    const cells = dataCells(row);
    if (cells.length < 7) continue;

    const code = cells[1]?.text ?? '';
    if (!/^\d{8}$/.test(code)) continue;

    const dateRaw = cells[6]?.text ?? '';
    const timeRaw = cells[7]?.text ?? '';
    const time = parseTimeRange(timeRaw);
    const locationRaw = cells[8]?.text ?? '';
    const isGenericFinal = Boolean(genericFinalExamLocation(locationRaw));
    const reasonRaw = isGenericFinal ? locationRaw : (!time || !dateRaw || dateRaw === '-' ? dateRaw || locationRaw : '');
    const reason = cleanExamLocation(reasonRaw);
    const isTba = !time || !dateRaw || dateRaw === '-' || timeRaw === '-' || isGenericFinal;

    exams.push({
      code,
      name: cells[2]?.text ?? '',
      section: cells[3]?.text ?? '',
      type: normalizeClassType(cells[5]?.text ?? ''),
      dateRaw,
      start: time?.start ?? '',
      end: time?.end ?? '',
      startMinutes: time?.startMinutes ?? 0,
      endMinutes: time?.endMinutes ?? 0,
      sortKey: parseThaiDateSortKey(dateRaw),
      location: cleanExamLocation(locationRaw || reason),
      reason,
      isTba,
    });
  }

  return {
    student: parseStudentInfo(html),
    exams,
  };
}

function parseGradeNotes(html) {
  const text = stripTags(html);
  const match = text.match(/(?:หมายเหตุ|สัญลักษณ์)[\s\S]*$/);
  return match ? match[0].split('\n').map((line) => line.trim()).filter(Boolean) : [];
}

export function parseGradeReport(html) {
  const rows = getRows(html);
  const courses = [];
  const summary = [];

  for (const row of rows) {
    const cells = dataCells(row);
    if (cells.length < 7) continue;

    if (/^\d+$/.test(cells[0].text) && /^\d{8}$/.test(cells[1].text)) {
      courses.push({
        no: cells[0].text,
        code: cells[1].text,
        name: cells[2].text,
        section: cells[3].text,
        credit: cells[4].text,
        type: cells[5].text,
        grade: cells[6].text,
      });
    }

    const title = cells[0].text.replace(/\s+/g, ' ');
    if (['Cumulation', 'Semester', 'Pre-Semester'].includes(title)) {
      summary.push({
        title,
        ca: cells[1]?.text ?? '',
        cp: cells[2]?.text ?? '',
        cd: cells[3]?.text ?? '',
        gp: cells[4]?.text ?? '',
        gpa: cells[5]?.text ?? '',
        status: cells[6]?.text ?? '',
      });
    }
  }

  return {
    student: parseStudentInfo(html),
    courses,
    summary,
    notes: parseGradeNotes(html),
  };
}

export function parseSelectionOptions(html, selectId) {
  const selectMatch = html.match(new RegExp(`<select[^>]+id=["']${selectId}["'][^>]*>([\\s\\S]*?)<\\/select>`, 'i'));
  if (!selectMatch) return [];

  return [...selectMatch[1].matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/gi)].map((match) => {
    const value = match[1].match(/value=["']?([^"'\s>]+)/i)?.[1] ?? stripTags(match[2]);
    return {
      value,
      label: stripTags(match[2]),
      selected: /\bselected\b/i.test(match[1]),
    };
  });
}
