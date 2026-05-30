const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

const DIVISIONS: { amount: number; unit: Intl.RelativeTimeFormatUnit }[] = [
  { amount: 60, unit: 'seconds' },
  { amount: 60, unit: 'minutes' },
  { amount: 24, unit: 'hours' },
  { amount: 7, unit: 'days' },
  { amount: 4.34524, unit: 'weeks' },
  { amount: 12, unit: 'months' },
  { amount: Number.POSITIVE_INFINITY, unit: 'years' },
];

/** "3 days ago", "in 2 hours" — native, no dependency. */
export function relativeTime(iso: string): string {
  const date = new Date(iso);
  let duration = (date.getTime() - Date.now()) / 1000; // seconds, signed
  for (const division of DIVISIONS) {
    if (Math.abs(duration) < division.amount) {
      return rtf.format(Math.round(duration), division.unit);
    }
    duration /= division.amount;
  }
  return rtf.format(Math.round(duration), 'years');
}

/** Absolute, locale-aware date-time for tooltips/titles. */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString();
}
