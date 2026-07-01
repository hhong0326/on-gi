import {defineRouting} from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['ko', 'en', 'es', 'fr', 'pt'],
  defaultLocale: 'ko',
});
