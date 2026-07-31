/** Format a decimal string as a currency value, e.g. "AUD 2,180.00". */
export function formatCurrency(amount: string, currency: string): string {
  try {
    const num = parseFloat(amount);
    return `${currency} ${num.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } catch {
    return `${currency} ${amount}`;
  }
}

/** Format decimal hours string as "42.50 h". */
export function formatHours(hours: string): string {
  try {
    const num = parseFloat(hours);
    return `${num.toFixed(2)} h`;
  } catch {
    return `${hours} h`;
  }
}

/** Format YYYY-MM-DD as "22 Jul 2026". */
export function formatDate(isoDate: string): string {
  try {
    const d = new Date(isoDate + 'T00:00:00');
    return d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return isoDate;
  }
}

/** Format "YYYY-MM-DD – YYYY-MM-DD" billing period. */
export function formatPeriod(start: string, end: string): string {
  return `${formatDate(start)} – ${formatDate(end)}`;
}

/** Format "09:00 – 17:00" time range. */
export function formatTimeRange(start: string | null, end: string | null): string {
  if (!start && !end) return '—';
  return `${start ?? '—'} – ${end ?? '—'}`;
}
