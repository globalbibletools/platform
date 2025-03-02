"use server";

import * as z from "zod";
import { getLocale, getTranslations } from "next-intl/server";
import { parseForm } from "@/form-parser";
import { redirect } from "next/navigation";
import { parseReference } from "@/verse-utils";
import { serverActionLogger } from "@/server-action";

const requestSchema = z.object({
  language: z.string(),
  reference: z.string(),
});

export async function changeInterlinearLocation(
  formData: FormData,
): Promise<void> {
  const logger = serverActionLogger("changeInterlinearLocation");

  const locale = await getLocale();
  const t = await getTranslations("TranslationToolbar");

  const request = requestSchema.safeParse(parseForm(formData));
  if (!request.success) {
    logger.error("request parse error");
    return;
  }

  let verseId;
  try {
    verseId = parseReference(request.data.reference, t.raw("book_names"));
  } catch (error) {
    logger.error(error);
    return;
  }

  redirect(`/${locale}/translate/${request.data.language}/${verseId}`);
}
