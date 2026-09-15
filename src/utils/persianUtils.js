import moment from 'jalali-moment';
const farsiDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
export function toFarsiDigits(num) {
    if (num === null || num === undefined)
        return '';
    const str = num.toString();
    return str.replace(/\d/g, (x) => farsiDigits[parseInt(x, 10)]);
}
export function toEnglishDigits(str) {
    if (str === null || str === undefined)
        return '';
    return str.toString().replace(/[۰-۹]/g, (w) => (w.charCodeAt(0) - 1776).toString());
}
export function parseMoneyValue(input) {
    if (input === null || input === undefined || input === '')
        return 0;
    if (typeof input === 'number')
        return isNaN(input) ? 0 : input;
    const engStr = toEnglishDigits(input.toString());
    const cleanStr = engStr.replace(/[^0-9-]/g, '');
    const parsed = parseInt(cleanStr, 10);
    return isNaN(parsed) ? 0 : parsed;
}
export function formatMoneyNumber(amount) {
    if (amount === null || amount === undefined || amount === '')
        return '';
    const num = typeof amount === 'number' ? amount : parseMoneyValue(amount);
    if (isNaN(num))
        return '';
    const formattedEng = Math.abs(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '٬');
    const farsiFormatted = toFarsiDigits(formattedEng);
    return num < 0 ? `${farsiFormatted}-` : farsiFormatted;
}
export function formatCurrency(amount, unit = 'تومان') {
    if (amount === null || amount === undefined || amount === '')
        return `۰ ${unit}`;
    const num = typeof amount === 'number' ? amount : parseMoneyValue(amount);
    if (isNaN(num))
        return `۰ ${unit}`;
    const formatted = formatMoneyNumber(num);
    return `${formatted} ${unit}`;
}
export function getTodayJalaliDate() {
    return toFarsiDigits(moment().locale('fa').format('jYYYY-jMM-jDD'));
}
export function getTodayJalaliString() {
    return moment().locale('fa').format('dddd D MMMM YYYY');
}
export function normalizeJalaliDate(dateStr) {
    if (!dateStr)
        return '';
    const eng = toEnglishDigits(dateStr).trim().replace(/\//g, '-');
    return toFarsiDigits(eng);
}
export function formatJalaliDateDisplay(dateStr) {
    if (!dateStr)
        return '';
    const eng = toEnglishDigits(dateStr).trim().replace(/-/g, '/');
    const parts = eng.split('/');
    if (parts.length === 3) {
        let [year, month, day] = parts;
        if (year.length <= 2 && day.length === 4) {
            const temp = year;
            year = day;
            day = temp;
        }
        const formatted = `${year}/${month.padStart(2, '0')}/${day.padStart(2, '0')}`;
        return toFarsiDigits(formatted);
    }
    return toFarsiDigits(eng);
}
export function getJalaliDateOffset(baseDateStr, daysOffset) {
    const eng = toEnglishDigits(baseDateStr).trim().replace(/\//g, '-');
    const m = moment(eng, 'jYYYY-jMM-jDD').locale('fa');
    if (!m.isValid())
        return baseDateStr;
    m.add(daysOffset, 'days');
    return toFarsiDigits(m.format('jYYYY-jMM-jDD'));
}
export function getDateRelationToToday(dateStr) {
    const normalizedTarget = toEnglishDigits(dateStr).trim().replace(/\//g, '-');
    const normalizedToday = toEnglishDigits(getTodayJalaliDate()).trim().replace(/\//g, '-');
    if (normalizedTarget < normalizedToday)
        return 'past';
    if (normalizedTarget > normalizedToday)
        return 'future';
    return 'today';
}
export function formatJalaliDateLong(dateStr) {
    const eng = toEnglishDigits(dateStr).trim().replace(/\//g, '-');
    const m = moment(eng, 'jYYYY-jMM-jDD').locale('fa');
    if (!m.isValid())
        return toFarsiDigits(dateStr);
    return m.format('dddd D MMMM YYYY');
}
export function isDueOrOverdue(dueDateStr) {
    if (!dueDateStr)
        return true;
    const normalizedDueDate = toEnglishDigits(dueDateStr).replace(/\//g, '-');
    const normalizedToday = toEnglishDigits(getTodayJalaliDate()).replace(/\//g, '-');
    return normalizedDueDate <= normalizedToday;
}
export function isPastUnfinalizedAppointment(apt) {
    if (!apt || !apt.date)
        return false;
    const normTarget = toEnglishDigits(apt.date).trim().replace(/\//g, '-');
    const normToday = toEnglishDigits(getTodayJalaliDate()).trim().replace(/\//g, '-');
    if (normTarget >= normToday)
        return false;
    // Finalized criteria: status is completed, canceled, rescheduled, OR presenceStatus is absent
    if (apt.status === 'completed' || apt.status === 'canceled' || apt.status === 'rescheduled') {
        return false;
    }
    if (apt.presenceStatus === 'absent') {
        return false;
    }
    return true;
}
export function getJalaliDaysOfWeek() {
    const m = moment().locale('fa');
    const days = [];
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
export function getJalaliDayOfWeekName(dateStr) {
    if (!dateStr)
        return 'شنبه';
    const eng = toEnglishDigits(dateStr).trim().replace(/\//g, '-');
    const m = moment(eng, 'jYYYY-jMM-jDD').locale('fa');
    if (!m.isValid())
        return 'شنبه';
    return m.format('dddd');
}
