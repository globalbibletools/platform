import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import arMessages from "../../messages/ar.json";
import enMessages from "../../messages/en.json";
import { defaultLocale } from "./shared";

const localeMessagesSchema = z.object({
  localeCode: z.string(),
});

const localeMessagesMap: Record<string, typeof enMessages> = {
  ar: arMessages,
  en: enMessages,
} as const;
const fallbackMessages = localeMessagesMap[defaultLocale.code];

export const fetchLocaleMessages = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => localeMessagesSchema.parse(input))
  .handler(({ data }) => {
    return localeMessagesMap[data.localeCode] ?? fallbackMessages;
  });
