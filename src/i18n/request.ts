import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import deepmerge from 'deepmerge';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  // English is the base layer; the requested locale is deep-merged on top so
  // any key missing from a partial translation silently falls back to English
  // instead of rendering the raw key name. Translation files always lag the
  // source of truth — this keeps a half-translated locale 90% right, not 90%
  // broken.
  const englishMessages = (await import('../messages/en.json')).default;
  const localeMessages =
    locale === routing.defaultLocale
      ? englishMessages
      : (await import(`../messages/${locale}.json`)).default;

  return {
    locale,
    messages: deepmerge(englishMessages, localeMessages),
  };
});
