import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from 'date-fns'

// India-specific timezone string used with Intl APIs.
const IST_TZ = 'Asia/Kolkata'

/**
 * Parse a date value into a JS Date, always returning a valid object.
 */
function toDate(date: Date | string): Date {
  return typeof date === 'string' ? parseISO(date) : date
}

/**
 * Format a UTC date for display in IST using the browser's Intl engine.
 * This is the correct way — avoids the double-shift bug that happened when
 * manually adding 5.5 h and then letting date-fns re-apply the local offset.
 *
 * @example formatIST('2024-01-15T10:30:00Z') → "15 Jan 2024, 04:00 PM"
 */
export function formatIST(
  date: Date | string,
  fmt: string = 'dd MMM yyyy, hh:mm a',
): string {
  // Convert UTC instant to an IST wall-clock Date before formatting.
  const d = toDate(date)
  const istWallClock = new Date(
    d.toLocaleString('en-US', { timeZone: IST_TZ })
  )
  return format(istWallClock, fmt)
}

/**
 * Get human-readable relative time.
 *
 * @example timeAgo('2024-01-15T10:30:00Z') → "3 hours ago"
 */
export function timeAgo(date: Date | string): string {
  return formatDistanceToNow(toDate(date), { addSuffix: true })
}

/**
 * Format date for display with smart labels (Today / Yesterday / full date).
 * All comparisons happen in IST so "Today" means today in India, not UTC.
 *
 * @example
 * smartDate(today)     → "Today, 4:00 PM"
 * smartDate(yesterday) → "Yesterday, 2:30 PM"
 * smartDate(older)     → "15 Jan 2024"
 */
export function smartDate(date: Date | string): string {
  const d = toDate(date)
  // Derive the IST wall-clock date for isToday / isYesterday comparison.
  const istWallClock = new Date(
    d.toLocaleString('en-US', { timeZone: IST_TZ })
  )
  if (isToday(istWallClock))     return `Today, ${format(istWallClock, 'h:mm a')}`
  if (isYesterday(istWallClock)) return `Yesterday, ${format(istWallClock, 'h:mm a')}`
  return format(istWallClock, 'dd MMM yyyy')
}

/**
 * Format a date for calendar display (short).
 *
 * @example formatCalendarDate('2024-01-15') → "15 Jan"
 */
export function formatCalendarDate(date: Date | string): string {
  return format(toDate(date), 'dd MMM')
}

/**
 * Format time only in IST.
 *
 * @example formatTimeIST('2024-01-15T10:30:00Z') → "4:00 PM"
 */
export function formatTimeIST(date: Date | string): string {
  const d = toDate(date)
  const istWallClock = new Date(
    d.toLocaleString('en-US', { timeZone: IST_TZ })
  )
  return format(istWallClock, 'h:mm a')
}

/**
 * Get ISO date string (YYYY-MM-DD) for a given date.
 */
export function toISODate(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

// Kept for any code that imported toIST directly — now a no-op alias.
// date-fns already applies the browser's local offset; explicit IST shifting
// caused every time to be double-offset by +11 hours on IST devices.
export function toIST(date: Date | string): Date {
  const d = toDate(date)
  return new Date(d.toLocaleString('en-US', { timeZone: IST_TZ }))
}
