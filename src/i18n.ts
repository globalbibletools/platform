import {notFound} from 'next/navigation';
import {getRequestConfig} from 'next-intl/server';
import languages from './languages.json' assert { type: 'json' };

const locales = Object.keys(languages)
 
export default getRequestConfig(async ({locale}) => {
  if (!locales.includes(locale as any)) notFound();
 
  return {
    messages: (await import(`./messages/${locale}`)).default
  };
});
