const DEFAULT_TIME_ZONE = 'Europe/Warsaw';

const formatterCache = new Map<string, Intl.DateTimeFormat>();

const getFormatter = (timeZone: string) => {
  const cached = formatterCache.get(timeZone);
  if (cached) {
    return cached;
  }
  const formatter = new Intl.DateTimeFormat('pl-PL', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  });
  formatterCache.set(timeZone, formatter);
  return formatter;
};

export type DateInput = string | number | Date | null | undefined;

export const formatDateTime = (value: DateInput, timeZone = DEFAULT_TIME_ZONE) => {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  const parts = getFormatter(timeZone).formatToParts(date);
  const lookup: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      lookup[part.type] = part.value;
    }
  }

  const { year, month, day, hour, minute, second } = lookup;
  if (!year || !month || !day || !hour || !minute || !second) {
    return date.toISOString();
  }
  return `${day}-${month}-${year}, ${hour}:${minute}:${second}`;
};
