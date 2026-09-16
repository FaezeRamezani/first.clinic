/**
 * System-wide Validation & Normalization Utility Module (Backend)
 */

/**
 * Normalizes Persian/Arabic digits to English digits (0-9)
 */
export function normalizeDigits(str: string | number | null | undefined): string {
  if (str === null || str === undefined) return '';
  return str
    .toString()
    .replace(/[۰-۹]/g, (w) => (w.charCodeAt(0) - 1776).toString())
    .replace(/[٠-٩]/g, (w) => (w.charCodeAt(0) - 1632).toString());
}

/**
 * Normalizes Arabic characters (ي/ك) to standard Persian characters (ی/ک)
 */
export function normalizePersianChars(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .toString()
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک');
}

/**
 * Validates Persian Name / Full Name
 */
export function validatePersianName(name: string | null | undefined, fieldLabel: string = 'نام'): { isValid: boolean; normalized: string; error?: string } {
  if (!name || !name.trim()) {
    return { isValid: false, normalized: '', error: `${fieldLabel} الزامی است` };
  }

  const normalized = normalizePersianChars(normalizeDigits(name.trim()));

  if (normalized.length < 2) {
    return { isValid: false, normalized, error: `${fieldLabel} باید حداقل ۲ کاراکتر باشد` };
  }

  if (normalized.length > 100) {
    return { isValid: false, normalized, error: `${fieldLabel} نمی‌تواند بیش از ۱۰۰ کاراکتر باشد` };
  }

  const parts = normalized.split(/\s+/);
  for (const part of parts) {
    if (part.length > 50) {
      return { isValid: false, normalized, error: `هر بخش از ${fieldLabel} نمی‌تواند بیش از ۵۰ کاراکتر باشد` };
    }
  }

  const persianNameRegex = /^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\u200c\s]+$/;
  if (!persianNameRegex.test(normalized)) {
    return { isValid: false, normalized, error: `${fieldLabel} فقط باید شامل حروف فارسی باشد (بدون عدد یا کاراکتر انگلیسی)` };
  }

  if (/(.)\1{4,}/u.test(normalized) || /(.{1,5})\1{4,}/u.test(normalized)) {
    return { isValid: false, normalized, error: `${fieldLabel} وارد شده دارای الگوی تکراری غیرعادی است` };
  }

  return { isValid: true, normalized };
}

/**
 * Validates Iranian Mobile Number
 */
export function validateIranianMobile(mobile: string | null | undefined): { isValid: boolean; normalized: string; error?: string } {
  if (!mobile || !mobile.trim()) {
    return { isValid: false, normalized: '', error: 'شماره موبایل الزامی است' };
  }

  const normalized = normalizeDigits(mobile.trim());

  const mobileRegex = /^09\d{9}$/;
  if (!mobileRegex.test(normalized)) {
    return {
      isValid: false,
      normalized,
      error: 'شماره موبایل باید ۱۱ رقم و با 09 شروع شود (مثال: 09123456789)'
    };
  }

  return { isValid: true, normalized };
}

/**
 * Validates Iranian National ID (کد ملی)
 */
export function validateIranianNationalId(
  nationalId: string | null | undefined,
  isOptional: boolean = true
): { isValid: boolean; normalized: string; error?: string } {
  if (!nationalId || !nationalId.trim()) {
    if (isOptional) return { isValid: true, normalized: '' };
    return { isValid: false, normalized: '', error: 'کد ملی الزامی است' };
  }

  const normalized = normalizeDigits(nationalId.trim());

  if (!/^\d{10}$/.test(normalized)) {
    return { isValid: false, normalized, error: 'کد ملی باید دقیقاً ۱۰ رقم باشد' };
  }

  if (/^(\d)\1{9}$/.test(normalized)) {
    return { isValid: false, normalized, error: 'کد ملی وارد شده معتبر نیست' };
  }

  const checkDigit = parseInt(normalized.charAt(9), 10);
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(normalized.charAt(i), 10) * (10 - i);
  }
  const remainder = sum % 11;

  const isValidChecksum = remainder < 2
    ? checkDigit === remainder
    : checkDigit === 11 - remainder;

  if (!isValidChecksum) {
    return { isValid: false, normalized, error: 'کد ملی وارد شده ساختار معتبری ندارد (کنترل رقم چک)' };
  }

  return { isValid: true, normalized };
}

/**
 * Sanitizes Free Text Fields
 */
export function sanitizeFreeText(text: string | null | undefined, maxLength: number = 1000): string | null | undefined {
  if (text === null || text === undefined) return text;
  const sanitized = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  return sanitized.slice(0, maxLength);
}
