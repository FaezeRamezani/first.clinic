/**
 * Date Utility for Backend Database Standardization
 * Stores Jalali dates strictly as YYYY-MM-DD with English digits and hyphen separator.
 * Example: "1405-06-16" (NOT "۱۴۰۵/۰۶/۱۶" and NOT Gregorian "2026-09-07").
 */

const farsiDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

export function toEnglishDigits(str: string | number | null | undefined): string {
  if (str === null || str === undefined) return '';
  return str.toString().replace(/[۰-۹]/g, (w) => (w.charCodeAt(0) - 1776).toString());
}

export function toStandardJalaliDbDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const clean = toEnglishDigits(dateStr).trim().replace(/\//g, '-');
  const parts = clean.split('-').map(p => p.trim());
  if (parts.length === 3) {
    let [year, month, day] = parts;
    if (year.length <= 2 && day.length === 4) {
      const temp = year;
      year = day;
      day = temp;
    }
    return `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return clean;
}
