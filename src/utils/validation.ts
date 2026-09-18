/**
 * System-wide Validation & Normalization Utility Module (Frontend)
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
 * - Accepts Persian letters, spaces, half-space (\u200c)
 * - Rejects English letters, digits, emojis, symbols, control chars
 * - Min length: 2 chars
 * - Max length: 100 chars (50 per name part)
 * - Abuse prevention: Rejects 5+ consecutive identical characters or 5+ repeated short word patterns
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

  // Check each space-separated name part for max 50 chars limit
  const parts = normalized.split(/\s+/);
  for (const part of parts) {
    if (part.length > 50) {
      return { isValid: false, normalized, error: `هر بخش از ${fieldLabel} نمی‌تواند بیش از ۵۰ کاراکتر باشد` };
    }
  }

  // Persian/Arabic letters + space + half-space
  const persianNameRegex = /^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\u200c\s]+$/;
  if (!persianNameRegex.test(normalized)) {
    return { isValid: false, normalized, error: `${fieldLabel} فقط باید شامل حروف فارسی باشد (بدون عدد یا کاراکتر انگلیسی)` };
  }

  // Abuse prevention: 5+ repeated identical chars or 5+ repeated word tokens
  if (/(.)\1{4,}/u.test(normalized) || /(.{1,5})\1{4,}/u.test(normalized)) {
    return { isValid: false, normalized, error: `${fieldLabel} وارد شده دارای الگوی تکراری غیرعادی است` };
  }

  return { isValid: true, normalized };
}

/**
 * Normalizes Iranian Mobile Number
 * - Fixes 10-digit numbers starting with 9 by prepending 0 (e.g. 9151234567 -> 09151234567)
 * - Converts 989... (12 digits) to 09...
 * - Handles numeric inputs from Excel (removing decimals like .0)
 * - Normalizes Persian/Arabic digits to English digits
 */
export function normalizeIranianMobile(mobile: string | number | null | undefined): string {
  if (mobile === null || mobile === undefined) return '';

  let str = mobile.toString().trim();
  str = str.replace(/\.0+$/, '');
  str = normalizeDigits(str);

  const digitsOnly = str.replace(/\D/g, '');

  if (digitsOnly.length === 10 && digitsOnly.startsWith('9')) {
    return '0' + digitsOnly;
  }

  if (digitsOnly.length === 12 && digitsOnly.startsWith('989')) {
    return '0' + digitsOnly.slice(2);
  }

  if (digitsOnly.length === 11 && digitsOnly.startsWith('09')) {
    return digitsOnly;
  }

  return digitsOnly;
}

/**
 * Validates Iranian Mobile Number
 */
export function validateIranianMobile(mobile: string | number | null | undefined): { isValid: boolean; normalized: string; error?: string } {
  if (mobile === null || mobile === undefined || mobile === '') {
    return { isValid: false, normalized: '', error: 'شماره موبایل الزامی است' };
  }

  const normalized = normalizeIranianMobile(mobile);

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
 * - Optional if isOptional = true and input is empty
 * - Exactly 10 digits
 * - Rejects all-same patterns (e.g., 0000000000)
 * - Verifies Iranian National ID Checksum algorithm
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

  // Strictly 10 digits
  if (!/^\d{10}$/.test(normalized)) {
    return { isValid: false, normalized, error: 'کد ملی باید دقیقاً ۱۰ رقم باشد' };
  }

  // Reject all-same digits (0000000000, 1111111111, ..., 9999999999)
  if (/^(\d)\1{9}$/.test(normalized)) {
    return { isValid: false, normalized, error: 'کد ملی وارد شده معتبر نیست' };
  }

  // Standard Iranian National ID Checksum Algorithm
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
 * Validates Physical File Number (where editable)
 */
export function validatePhysicalFileNumber(
  fileNum: string | null | undefined,
  isOptional: boolean = true
): { isValid: boolean; normalized: string; error?: string } {
  if (!fileNum || !fileNum.trim()) {
    if (isOptional) return { isValid: true, normalized: '' };
    return { isValid: false, normalized: '', error: 'شماره پرونده الزامی است' };
  }

  const normalized = normalizeDigits(fileNum.trim());

  if (normalized.length > 20) {
    return { isValid: false, normalized, error: 'شماره پرونده نمی‌تواند بیش از ۲۰ کاراکتر باشد' };
  }

  // System physical file numbers can be digits or CL-xxxx format
  if (!/^[a-zA-Z0-9\-\/]+$/.test(normalized) && !/^[\u0600-\u06FF0-9\-\/]+$/.test(normalized)) {
    return { isValid: false, normalized, error: 'فرمت شماره پرونده معتبر نیست' };
  }

  return { isValid: true, normalized };
}

/**
 * Validates Free-Text Fields (Notes, Address, Description)
 * - Preserves free-text nature
 * - Enforces max length (default 1000)
 * - Sanitizes dangerous ASCII control characters
 */
export function validateFreeText(
  text: string | null | undefined,
  maxLength: number = 1000,
  fieldLabel: string = 'توضیحات'
): { isValid: boolean; normalized: string; error?: string } {
  if (!text) return { isValid: true, normalized: '' };

  // Strip control chars (0-31 except \n and \t)
  const sanitized = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  if (sanitized.length > maxLength) {
    return {
      isValid: false,
      normalized: sanitized,
      error: `${fieldLabel} نمی‌تواند بیش از ${maxLength} کاراکتر باشد`
    };
  }

  return { isValid: true, normalized: sanitized };
}

/**
 * Validates Numeric Range
 */
export function validateNumericRange(
  val: number | string | null | undefined,
  min: number = 0,
  max: number = Number.MAX_SAFE_INTEGER,
  fieldLabel: string = 'مقدار عددی'
): { isValid: boolean; value: number; error?: string } {
  if (val === null || val === undefined || val === '') {
    return { isValid: true, value: 0 };
  }

  const num = typeof val === 'number' ? val : parseInt(normalizeDigits(val.toString()), 10);

  if (isNaN(num)) {
    return { isValid: false, value: 0, error: `${fieldLabel} باید عدد معتبر باشد` };
  }

  if (num < min) {
    return { isValid: false, value: num, error: `${fieldLabel} نمی‌تواند کمتر از ${min} باشد` };
  }

  if (num > max) {
    return { isValid: false, value: num, error: `${fieldLabel} نمی‌تواند بیشتر از ${max} باشد` };
  }

  return { isValid: true, value: num };
}
