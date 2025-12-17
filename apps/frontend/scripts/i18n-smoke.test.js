// Simple i18n smoke test: ensure Next.js i18n config includes PL/DE/NL + EN fallback.
const config = require('../next.config');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const locales = config.i18n?.locales || [];
const defaultLocale = config.i18n?.defaultLocale;

assert(locales.includes('pl'), 'Locale pl missing');
assert(locales.includes('de'), 'Locale de missing');
assert(locales.includes('nl'), 'Locale nl missing');
assert(locales.includes('en'), 'Locale en missing');
assert(defaultLocale === 'en', 'Default locale must be en for fallback');

// eslint-disable-next-line no-console
console.log('i18n smoke passed (pl,de,nl + fallback en).');
