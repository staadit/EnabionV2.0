export function getCookieValue(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  const cookies = header.split(';');
  for (const entry of cookies) {
    const [rawKey, ...rest] = entry.trim().split('=');
    if (!rawKey) {
      continue;
    }
    if (rawKey === name) {
      return decodeURIComponent(rest.join('='));
    }
  }
  return undefined;
}
