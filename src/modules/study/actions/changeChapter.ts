"use server";

import * as z from "zod";
import { parseForm } from "@/form-parser";
import { parseReference } from "@/verse-utils";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { serverActionLogger } from "@/server-action";

const requestSchema = z.object({
  language: z.string(),
  reference: z.string(),
});

export async function changeChapter(formData: FormData): Promise<void> {
  const logger = serverActionLogger("changeChapter");

  const locale = await getLocale();
  const t = await getTranslations("ReadingToolbar");

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

  if (verseId) {
    redirect(
      `/${locale}/read/${request.data.language}/${verseId.slice(0, -3)}`,
    );
  }
}
