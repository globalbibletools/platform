import * as z from "zod";
import { serverActionLogger } from "@/server-action";
import { createServerFn } from "@tanstack/react-start";
import glossRepository from "@/modules/translation/data-access/GlossRepository";

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
      throw new Error("errors.all_approved");
    }

    return { nextVerseId };
  });
