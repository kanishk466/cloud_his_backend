/**
 * Convert "HH:mm" string to total minutes from midnight
 * Example: "09:30" → 570
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert minutes from midnight to "HH:mm" string
 * Example: 570 → "09:30"
 */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Check if two time windows overlap
 * Window A: 09:00-11:00
 * Window B: 10:00-12:00  → overlaps ✅
 * Window B: 11:00-12:00  → no overlap (touching is ok) ✅
 */
export function doWindowsOverlap(
  a: { startTime: string; endTime: string },
  b: { startTime: string; endTime: string },
): boolean {
  const aStart = timeToMinutes(a.startTime);
  const aEnd = timeToMinutes(a.endTime);
  const bStart = timeToMinutes(b.startTime);
  const bEnd = timeToMinutes(b.endTime);

  // Overlap exists if one starts before the other ends
  // Touching (aEnd === bStart) is NOT an overlap
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Check if startTime is strictly before endTime
 */
export function isValidTimeRange(startTime: string, endTime: string): boolean {
  return timeToMinutes(startTime) < timeToMinutes(endTime);
}

/**
 * Generate time slots within a window
 *
 * Example:
 *   startTime: "09:00"
 *   endTime:   "11:00"
 *   duration:  15 mins
 *   buffer:    5 mins
 *
 * Result: 09:00-09:15, 09:20-09:35, 09:40-09:55, 10:00-10:15...
 */
export function generateSlotsForWindow(
  startTime: string,
  endTime: string,
  slotDurationMins: number,
  bufferTimeMins: number,
): Array<{ startTime: string; endTime: string }> {
  const slots: Array<{ startTime: string; endTime: string }> = [];

  const endMinutes = timeToMinutes(endTime);
  const step = slotDurationMins + bufferTimeMins;

  let current = timeToMinutes(startTime);

  while (current + slotDurationMins <= endMinutes) {
    slots.push({
      startTime: minutesToTime(current),
      endTime: minutesToTime(current + slotDurationMins),
    });
    current += step;
  }

  return slots;
}

/**
 * Day of week number to readable name
 */
export const DAY_NAMES: Record<number, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
};

/**
 * Parse a date string "YYYY-MM-DD" into a Date object (UTC midnight)
 * Avoids timezone shift issues
 */
export function parseDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Check if a date string is today or in the future
 */
export function isNotInPast(dateStr: string): boolean {
  const target = parseDateString(dateStr);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return target >= today;
}