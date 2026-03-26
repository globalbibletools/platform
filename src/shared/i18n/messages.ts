import { createIsomorphicFn, createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import arMessages from "../../messages/ar.json";
import enMessages from "../../messages/en.json";
import { defaultLocale, getCurrentLocale } from "./shared";
import {
  createTranslator,
  NamespaceKeys,
  NestedKeyOf,
  _Translator,
} from "use-intl";

const localeMessagesSchema = z.object({
  localeCode: z.string(),
});

type Messages = typeof enMessages;
type Namespace = NamespaceKeys<Messages, NestedKeyOf<Messages>>;

export const localeMessagesMap: Record<string, Messages> = {
  ar: arMessages,
  en: enMessages,
} as const;
const fallbackMessages = localeMessagesMap[defaultLocale.code];

export function getLocaleMessagesByCode(localeCode: string) {
  return localeMessagesMap[localeCode] ?? fallbackMessages;
}

export const fetchLocaleMessages = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => localeMessagesSchema.parse(input))
  .handler(({ data }) => {
    return getLocaleMessagesByCode(data.localeCode);
  });

const localeCache: Record<string, Messages> = {};
export const getMessages = createIsomorphicFn()
  .server((): Promise<Messages> => {
    const locale = getCurrentLocale();
    return Promise.resolve(localeMessagesMap[locale.code]);
  })
  .client(async (): Promise<Messages> => {
    const locale = getCurrentLocale();

    const cached = localeCache[locale.code];
    if (cached) {
      return cached;
    }

    const result = await fetchLocaleMessages({
      data: { localeCode: locale.code },
    });
    localeCache[locale.code] = result;
    return result;
  });

export async function getTranslator(): Promise<_Translator<Messages>>;
export async function getTranslator<N extends Namespace>(
  namespace: N,
): Promise<_Translator<Messages, N>>;
export async function getTranslator<N extends Namespace>(
  namespace?: N,
): Promise<_Translator<Messages, N>> {
  const locale = getCurrentLocale();
  const messages = await getMessages();

  return createTranslator({
    locale: locale.code,
    messages,
    namespace,
  });
}
