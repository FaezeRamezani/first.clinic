// Utilities for Farsi numbers, currency, and Jalali dates

const farsiDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

export function toFarsiDigits(num: number | string): string {
  if (num === null || num === undefined) return '';
  const str = num.toString();
  return str.replace(/\d/g, (x) => farsiDigits[parseInt(x, 10)]);
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
  // Returns Jalali date string matching the prompt timeframe e.g., 1405-06-16 (دوشنبه ۱۶ شهریور ۱۴۰۵)
  return '۱۴۰۵-۰۶-۱۶';
}

export function getTodayJalaliString(): string {
  return 'دوشنبه ۱۶ شهریور ۱۴۰۵';
}

export function getJalaliDaysOfWeek(): { day: string; date: string }[] {
  return [
    { day: 'شنبه', date: '۱۴ شهریور' },
    { day: 'یکشنبه', date: '۱۵ شهریور' },
    { day: 'دوشنبه', date: '۱۶ شهریور' },
    { day: 'سه‌شنبه', date: '۱۷ شهریور' },
    { day: 'چهارشنبه', date: '۱۸ شهریور' },
    { day: 'پنج‌شنبه', date: '۱۹ شهریور' },
    { day: 'جمعه', date: '۲۰ شهریور' },
  ];
}
