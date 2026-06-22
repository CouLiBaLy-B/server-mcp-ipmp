/** Formats a Date as ProjeQtOr timestamp YYYYMMDDHHMMSS in local/UTC Date fields. */
export function formatProjeqtorTimestamp(date: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}${p(date.getHours())}${p(date.getMinutes())}${p(date.getSeconds())}`;
}

export function parseDateInput(input: string | Date): Date {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid date: ${input}`);
  return date;
}

export function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

export function toProjeqtorDate(date: string | Date): string {
  return parseDateInput(date).toISOString().slice(0, 10);
}
