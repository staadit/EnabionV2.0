/** @type {import('next').NextConfig} */
const nextConfig = {
  i18n: {
    locales: ['en', 'pl', 'de', 'nl'],
    defaultLocale: 'en',
    localeDetection: false,
  },
};

module.exports = nextConfig;
