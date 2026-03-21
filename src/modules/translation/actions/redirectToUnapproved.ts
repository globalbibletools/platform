import * as z from "zod";
import { getTranslations } from "next-intl/server";
import { serverActionLogger } from "@/server-action";
import { createServerFn } from "@tanstack/react-start";
import glossRepository from "../data-access/GlossRepository";

const requestSchema = z.object({
  code: z.string(),
  verseId: z.string(),
});

export const redirectToUnapproved = createServerFn({ method: "POST" })
  .inputValidator(requestSchema)
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

    return { nextVerseId };
  });
