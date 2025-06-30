"use server";

import * as z from "zod";
import { getLocale, getTranslations } from "next-intl/server";
import { parseForm } from "@/form-parser";
import { serverActionLogger } from "@/server-action";
import { redirect } from "next/navigation";
import glossRepository from "../data-access/GlossRepository";

const requestSchema = z.object({
  code: z.string(),
  verseId: z.string(),
});

export async function redirectToUnapproved(
  formData: FormData,
): Promise<void | string> {
  const logger = serverActionLogger("redirectToUnapproved");

  const request = requestSchema.safeParse(parseForm(formData));
  if (!request.success) {
    logger.error("request parse error");
    return;
  }

  const nextVerseId = await glossRepository.findNextUnapproved(
    request.data.code,
    request.data.verseId,
  );

  if (typeof nextVerseId !== "string") {
    logger.error("all verses are approved");
    const t = await getTranslations("TranslationToolbar");
    return t("errors.all_approved");
  }

  const locale = await getLocale();
  redirect(`/${locale}/translate/${request.data.code}/${nextVerseId}`);
}
