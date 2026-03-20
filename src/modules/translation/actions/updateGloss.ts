import { parseForm } from "@/form-parser";
import { createPolicyMiddleware, Policy } from "@/modules/access";
import { serverActionLogger } from "@/server-action";
import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import * as z from "zod";
import { GlossApprovalMethodRaw, GlossStateRaw } from "../types";
import { updateGlossUseCase } from "../use-cases/updateGloss";
import { NotFoundError } from "@/shared/errors";

const requestSchema = z.object({
  verseId: z.string(),
  languageCode: z.string(),
  phraseId: z.coerce.number().int(),
  state: z.nativeEnum(GlossStateRaw).optional(),
  gloss: z.string().optional(),
  method: z.nativeEnum(GlossApprovalMethodRaw).optional(),
});

const policy = new Policy({
  languageMember: true,
});

type Request = z.infer<typeof requestSchema>;

export const updateGlossAction = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    if (!(data instanceof FormData)) {
      throw new Error("expected FormData");
    }

    return requestSchema.parse(parseForm(data));
  })
  .middleware([
    createPolicyMiddleware({
      policy,
      languageCodeField: "languageCode",
    }),
  ])
  .handler(
    async ({
      data,
      context,
    }: {
      data: Request;
      context: { session: { user: { id: string } } };
    }) => {
      const logger = serverActionLogger("updateGloss");

      try {
        await updateGlossUseCase({
          ...data,
          userId: context.session.user.id,
        });
      } catch (error) {
        if (error instanceof NotFoundError) {
          logger.error("not found");
          throw notFound();
        }

        throw error;
      }

      const locale = await getLocale();
      revalidatePath(
        `/${locale}/translate/${data.languageCode}/${data.verseId}`,
      );
    },
  );
