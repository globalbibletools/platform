import * as z from "zod";
import { getLocale, getTranslations } from "next-intl/server";
import { parseForm } from "@/form-parser";
import { serverActionLogger } from "@/server-action";
import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import glossRepository from "../data-access/GlossRepository";

const requestSchema = z.object({
  code: z.string(),
  verseId: z.string(),
});

export const redirectToUnapproved = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    if (!(data instanceof FormData)) {
      throw new Error("expected FormData");
    }

    return requestSchema.parse(parseForm(data));
  })
  .handler(async ({ data }) => {
    const logger = serverActionLogger("redirectToUnapproved");

    const nextVerseId = await glossRepository.findNextUnapproved(
      data.code,
      data.verseId,
    );

    if (typeof nextVerseId !== "string") {
      logger.error("all verses are approved");
      const t = await getTranslations("TranslationToolbar");
      throw new Error(t("errors.all_approved"));
    }

    const locale = await getLocale();
    throw redirect({ to: `/${locale}/translate/${data.code}/${nextVerseId}` });
  });
