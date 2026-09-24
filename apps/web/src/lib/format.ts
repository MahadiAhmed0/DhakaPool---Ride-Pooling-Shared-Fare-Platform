// Dates and times as people read them in Dhaka: "24 Sep 2026, 20:41".
const DATE_TIME = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});
const TIME = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' });

export function formatDateTime(isoTime: string): string {
  return DATE_TIME.format(new Date(isoTime));
}

export function formatTime(isoTime: string): string {
  return TIME.format(new Date(isoTime));
}
