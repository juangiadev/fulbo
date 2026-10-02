const DATE_TIME_24_FORMATTER = new Intl.DateTimeFormat('es-AR', {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const TIME_24_FORMATTER = new Intl.DateTimeFormat('es-AR', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export function formatDateTime24(value: Date | string | number): string {
  return DATE_TIME_24_FORMATTER.format(new Date(value));
}

export function formatTime24(value: Date | string | number): string {
  return TIME_24_FORMATTER.format(new Date(value));
}
