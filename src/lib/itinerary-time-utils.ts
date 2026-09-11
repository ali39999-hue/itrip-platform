/**
 * Itinerary Time Scheduling & Venue Operating Hours Conflict Detector.
 * Adapted from TrekForge / TREK scheduling engines.
 */

export interface VenueSchedule {
  openTime: string; // "HH:mm", e.g. "09:00"
  closeTime: string; // "HH:mm", e.g. "17:00"
  closedDays?: number[]; // 0 = Sun, 1 = Mon, ..., 5 = Fri, 6 = Sat
  lastEntryTime?: string; // "16:15"
  isAllDay?: boolean; // parks, public squares, walking streets
}

export interface SlotWindow {
  slot: number; // 1 = Morning, 2 = Afternoon, 3 = Evening
  name: { fa: string; en: string };
  startTime: string; // "09:00"
  endTime: string; // "13:00"
}

export const STANDARD_SLOTS: Record<number, SlotWindow> = {
  1: {
    slot: 1,
    name: { fa: 'صبح', en: 'Morning' },
    startTime: '09:00',
    endTime: '13:00',
  },
  2: {
    slot: 2,
    name: { fa: 'بعدازظهر', en: 'Afternoon' },
    startTime: '14:00',
    endTime: '18:00',
  },
  3: {
    slot: 3,
    name: { fa: 'عصر و شب', en: 'Evening' },
    startTime: '19:00',
    endTime: '23:00',
  },
};

/**
 * Converts "HH:mm" to minutes from midnight
 */
export function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Parses unstructured description or when strings to infer operating hours
 */
export function inferVenueSchedule(category: string, whenText = ''): VenueSchedule {
  const cat = (category || '').toLowerCase();
  const text = (whenText || '').toLowerCase();

  // All-day public locations
  if (
    cat === 'nature' ||
    text.includes('۲۴') ||
    text.includes('شبانه‌روزی') ||
    text.includes('همه‌روزه آزاد') ||
    text.includes('ساحل آزاد') ||
    text.includes('پارک عمومی')
  ) {
    return { openTime: '06:00', closeTime: '23:59', isAllDay: true };
  }

  // Nightlife, Yacht, Dinner, Theater, Festival
  if (cat === 'nightlife' || cat === 'yacht' || cat === 'theater' || text.includes('شب')) {
    return { openTime: '17:00', closeTime: '23:59' };
  }

  // Cultural heritage, museums, historical palaces
  if (cat === 'culture' || cat === 'museum' || text.includes('موزه') || text.includes('کاخ')) {
    return {
      openTime: '09:00',
      closeTime: '17:30',
      closedDays: [1], // Many museums closed on Mondays
    };
  }

  // Default daylight activity
  return { openTime: '09:00', closeTime: '21:00' };
}

export interface ScheduleConflict {
  hasConflict: boolean;
  type?: 'CLOSED_DAY' | 'CLOSED_DURING_SLOT' | 'EARLY_CLOSING';
  message: { fa: string; en: string };
  suggestedSlot?: number;
}

/**
 * Evaluates whether an activity in a given slot conflicts with venue hours
 */
export function checkScheduleConflict(
  slot: number,
  category: string,
  whenText?: string,
  travelDate?: string
): ScheduleConflict {
  const schedule = inferVenueSchedule(category, whenText);

  if (schedule.isAllDay) {
    return { hasConflict: false, message: { fa: 'بدون محدودیت زمانی', en: 'No time restriction' } };
  }

  const slotWindow = STANDARD_SLOTS[slot] || STANDARD_SLOTS[1];
  const slotStartMin = timeToMinutes(slotWindow.startTime);
  const slotEndMin = timeToMinutes(slotWindow.endTime);
  const venueOpenMin = timeToMinutes(schedule.openTime);
  const venueCloseMin = timeToMinutes(schedule.closeTime);

  // Check day of week closure if travelDate provided
  if (travelDate && schedule.closedDays && schedule.closedDays.length > 0) {
    const d = new Date(travelDate);
    if (!isNaN(d.getTime())) {
      const dayOfWeek = d.getDay();
      if (schedule.closedDays.includes(dayOfWeek)) {
        return {
          hasConflict: true,
          type: 'CLOSED_DAY',
          message: {
            fa: 'این مکان در این روز هفته تعطیل است.',
            en: 'This venue is closed on this day of the week.',
          },
          suggestedSlot: slot,
        };
      }
    }
  }

  // Evening slot conflict with museums (closes at 17:00 or 18:00)
  if (slot === 3 && venueCloseMin <= timeToMinutes('18:00')) {
    return {
      hasConflict: true,
      type: 'CLOSED_DURING_SLOT',
      message: {
        fa: `این مکان در شیفت شب تعطیل است (ساعت کار تا ${schedule.closeTime}). جابجایی به صبح یا بعدازظهر پیشنهاد می‌شود.`,
        en: `This venue is closed during evening hours (closes at ${schedule.closeTime}). Morning or Afternoon slot recommended.`,
      },
      suggestedSlot: 1,
    };
  }

  // Morning slot conflict with late-starting evening activities (opens at 17:00)
  if (slot === 1 && venueOpenMin >= timeToMinutes('16:00')) {
    return {
      hasConflict: true,
      type: 'CLOSED_DURING_SLOT',
      message: {
        fa: `این فعالیت شبانه است (شروع از ساعت ${schedule.openTime}). جابجایی به شیفت شب پیشنهاد می‌شود.`,
        en: `This is an evening activity (starts at ${schedule.openTime}). Evening slot recommended.`,
      },
      suggestedSlot: 3,
    };
  }

  // No overlap between slot window and venue hours
  if (slotEndMin <= venueOpenMin || slotStartMin >= venueCloseMin) {
    return {
      hasConflict: true,
      type: 'CLOSED_DURING_SLOT',
      message: {
        fa: `ساعت کار این مجموعه (${schedule.openTime} تا ${schedule.closeTime}) با بازه انتخابی همپوشانی ندارد.`,
        en: `Venue hours (${schedule.openTime} - ${schedule.closeTime}) do not overlap with the chosen time slot.`,
      },
      suggestedSlot: venueCloseMin <= timeToMinutes('18:00') ? 1 : 3,
    };
  }

  return {
    hasConflict: false,
    message: { fa: 'ساعات کاری منطبق است', en: 'Schedule fits operating hours' },
  };
}
