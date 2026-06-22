export function toProjeqtorDate(date: Date): string {
  const pad = (n: number, size = 2) => n.toString().padStart(size, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}
export function fromProjeqtorDate(dateStr: string): Date {
  if (dateStr.length < 14) throw new Error(`Invalid ProjeQtOr date format: ${dateStr}`);
  return new Date(
    parseInt(dateStr.substring(0, 4), 10),
    parseInt(dateStr.substring(4, 6), 10) - 1,
    parseInt(dateStr.substring(6, 8), 10),
    parseInt(dateStr.substring(8, 10), 10),
    parseInt(dateStr.substring(10, 12), 10),
    parseInt(dateStr.substring(12, 14), 10),
  );
}
export function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return toProjeqtorDate(date);
}
export function now(): string {
  return toProjeqtorDate(new Date());
}
export function daysBetween(startDate: string, endDate: string): number {
  const start = fromProjeqtorDate(startDate);
  const end = fromProjeqtorDate(endDate);
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}
export function getDateRange(daysBack: number): { from: string; to: string } {
  return { from: daysAgo(daysBack), to: now() };
}
