/**
 * Date utilities for ProjeQtOr API.
 * ProjeQtOr expects dates in the format YYYYMMDDHHMMSS.
 */

/**
 * Convert a Date object to ProjeQtOr's expected format: YYYYMMDDHHMMSS
 */
export function toProjeqtorDate(date: Date): string {
  const pad = (n: number, size = 2) => n.toString().padStart(size, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

/**
 * Convert a ProjeQtOr date string (YYYYMMDDHHMMSS) to a Date object
 */
export function fromProjeqtorDate(dateStr: string): Date {
  if (dateStr.length < 14) {
    throw new Error(`Invalid ProjeQtOr date format: ${dateStr}`);
  }
  const year = parseInt(dateStr.substring(0, 4), 10);
  const month = parseInt(dateStr.substring(4, 6), 10) - 1;
  const day = parseInt(dateStr.substring(6, 8), 10);
  const hour = parseInt(dateStr.substring(8, 10), 10);
  const minute = parseInt(dateStr.substring(10, 12), 10);
  const second = parseInt(dateStr.substring(12, 14), 10);
  return new Date(year, month, day, hour, minute, second);
}

/**
 * Get a ProjeQtOr date string for a given number of days ago
 */
export function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return toProjeqtorDate(date);
}

/**
 * Get current time in ProjeQtOr format
 */
export function now(): string {
  return toProjeqtorDate(new Date());
}

/**
 * Calculate the number of days between two ProjeQtOr date strings
 */
export function daysBetween(startDate: string, endDate: string): number {
  const start = fromProjeqtorDate(startDate);
  const end = fromProjeqtorDate(endDate);
  const diffMs = end.getTime() - start.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Format a date range for use with the "updated" endpoint
 * Returns a pair of ProjeQtOr date strings
 */
export function getDateRange(daysBack: number): { from: string; to: string } {
  return {
    from: daysAgo(daysBack),
    to: now(),
  };
}
