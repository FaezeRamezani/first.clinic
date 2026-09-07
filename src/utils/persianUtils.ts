import moment from 'jalali-moment';

const farsiDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

export function toFarsiDigits(num: number | string): string {
  if (num === null || num === undefined) return '';
  const str = num.toString();
  return str.replace(/\d/g, (x) => farsiDigits[parseInt(x, 10)]);
}

export function toEnglishDigits(str: string | number): string {
  if (str === null || str === undefined) return '';
  return str.toString().replace(/[۰-۹]/g, (w) => (w.charCodeAt(0) - 1776).toString());
}

export function formatCurrency(amount: number, unit: string = 'تومان'): string {
  if (isNaN(amount)) return `۰ ${unit}`;
  const formatted = Math.abs(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const farsiFormatted = toFarsiDigits(formatted);
  
  if (amount < 0) {
    return `${farsiFormatted}- ${unit}`;
  }
  return `${farsiFormatted} ${unit}`;
}

export function getTodayJalaliDate(): string {
  return toFarsiDigits(moment().locale('fa').format('jYYYY-jMM-jDD'));
}

export function getTodayJalaliString(): string {
  return moment().locale('fa').format('dddd D MMMM YYYY');
}

export function normalizeJalaliDate(dateStr: string): string {
  if (!dateStr) return '';
  const eng = toEnglishDigits(dateStr).trim().replace(/\//g, '-');
  return toFarsiDigits(eng);
}

export function getJalaliDateOffset(baseDateStr: string, daysOffset: number): string {
  const eng = toEnglishDigits(baseDateStr).trim().replace(/\//g, '-');
  const m = moment(eng, 'jYYYY-jMM-jDD').locale('fa');
  if (!m.isValid()) return baseDateStr;
  m.add(daysOffset, 'days');
  return toFarsiDigits(m.format('jYYYY-jMM-jDD'));
}

export function getDateRelationToToday(dateStr: string): 'past' | 'today' | 'future' {
  const normalizedTarget = toEnglishDigits(dateStr).trim().replace(/\//g, '-');
  const normalizedToday = toEnglishDigits(getTodayJalaliDate()).trim().replace(/\//g, '-');
  
  if (normalizedTarget < normalizedToday) return 'past';
  if (normalizedTarget > normalizedToday) return 'future';
  return 'today';
}

export function formatJalaliDateLong(dateStr: string): string {
  const eng = toEnglishDigits(dateStr).trim().replace(/\//g, '-');
  const m = moment(eng, 'jYYYY-jMM-jDD').locale('fa');
  if (!m.isValid()) return toFarsiDigits(dateStr);
  return m.format('dddd D MMMM YYYY');
}

export function isDueOrOverdue(dueDateStr?: string): boolean {
  if (!dueDateStr) return true;
  const normalizedDueDate = toEnglishDigits(dueDateStr).replace(/\//g, '-');
  const normalizedToday = toEnglishDigits(getTodayJalaliDate()).replace(/\//g, '-');
  return normalizedDueDate <= normalizedToday;
}

export function getJalaliDaysOfWeek(): { day: string; date: string }[] {
  const m = moment().locale('fa');
  const days: { day: string; date: string }[] = [];
  const dayNames = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'];
  for (let i = 0; i < 7; i++) {
    const dayMoment = m.clone().add(i, 'days');
    days.push({
      day: dayNames[i],
      date: dayMoment.format('D MMMM')
    });
  }
  return days;
}
