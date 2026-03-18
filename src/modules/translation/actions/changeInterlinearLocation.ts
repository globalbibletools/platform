import * as z from "zod";
import { getLocale, getTranslations } from "next-intl/server";
import { parseForm } from "@/form-parser";
import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { parseReference } from "@/verse-utils";
import { serverActionLogger } from "@/server-action";

const requestSchema = z.object({
  language: z.string(),
  reference: z.string(),
});

export const changeInterlinearLocation = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    if (!(data instanceof FormData)) {
      throw new Error("expected FormData");
    }

    return requestSchema.parse(parseForm(data));
  })
  .handler(async ({ data }) => {
    const logger = serverActionLogger("changeInterlinearLocation");

    const locale = await getLocale();
    const t = await getTranslations("TranslationToolbar");

    let verseId;
    try {
      verseId = parseReference(data.reference, t.raw("book_names"));
    } catch (error) {
      logger.error(error);
      return;
    }

    throw redirect({ to: `/${locale}/translate/${data.language}/${verseId}` });
  });
