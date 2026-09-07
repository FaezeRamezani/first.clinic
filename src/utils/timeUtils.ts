import { toEnglishDigits, toFarsiDigits } from './persianUtils';

// Central configuration for valid clinic booking slots
export const CLINIC_WORK_HOURS = {
  morningStart: '09:00',
  morningEnd: '13:00',
  eveningStart: '17:00',
  eveningEnd: '20:30' // Configurable end time for evening shift (20:30 or 21:00)
};

// Generate list of 30-minute interval slots between start and end (HH:mm in 24h English digits)
function generateSlotArray(startStr: string, endStr: string): string[] {
  const slots: string[] = [];
  const [startH, startM] = startStr.split(':').map(Number);
  const [endH, endM] = endStr.split(':').map(Number);

  let currentMins = startH * 60 + startM;
  const endMins = endH * 60 + endM;

  while (currentMins <= endMins) {
    const h = Math.floor(currentMins / 60);
    const m = currentMins % 60;
    const slotStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    slots.push(slotStr);
    currentMins += 30;
  }
  return slots;
}

export const MORNING_SLOTS = generateSlotArray(CLINIC_WORK_HOURS.morningStart, CLINIC_WORK_HOURS.morningEnd);
export const EVENING_SLOTS = generateSlotArray(CLINIC_WORK_HOURS.eveningStart, CLINIC_WORK_HOURS.eveningEnd);

export const ALL_VALID_SLOTS = [...MORNING_SLOTS, ...EVENING_SLOTS];

/**
 * Checks if a time slot (e.g. "10:30" or "۱۰:۳۰") is within allowed booking hours.
 */
export function isValidBookingSlot(timeSlot: string): boolean {
  if (!timeSlot) return false;
  const normSlot = toEnglishDigits(timeSlot).trim();
  const [h, m] = normSlot.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return false;
  const totalMins = h * 60 + m;

  const [mStartH, mStartM] = CLINIC_WORK_HOURS.morningStart.split(':').map(Number);
  const [mEndH, mEndM] = CLINIC_WORK_HOURS.morningEnd.split(':').map(Number);
  const morningStartMins = mStartH * 60 + mStartM;
  const morningEndMins = mEndH * 60 + mEndM;

  const [eStartH, eStartM] = CLINIC_WORK_HOURS.eveningStart.split(':').map(Number);
  const [eEndH, eEndM] = CLINIC_WORK_HOURS.eveningEnd.split(':').map(Number);
  const eveningStartMins = eStartH * 60 + eStartM;
  const eveningEndMins = eEndH * 60 + eEndM;

  return (totalMins >= morningStartMins && totalMins <= morningEndMins) ||
         (totalMins >= eveningStartMins && totalMins <= eveningEndMins);
}

/**
 * Returns morning and evening slots formatted in Farsi digits
 */
export function getAvailableTimeSlotsInFarsi(): { morning: string[]; evening: string[] } {
  return {
    morning: MORNING_SLOTS.map(s => toFarsiDigits(s)),
    evening: EVENING_SLOTS.map(s => toFarsiDigits(s))
  };
}
