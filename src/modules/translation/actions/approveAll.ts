import * as z from "zod";
import { getLocale } from "next-intl/server";
import { parseForm } from "@/form-parser";
import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { revalidatePath } from "next/cache";
import { serverActionLogger } from "@/server-action";
import { createPolicyMiddleware, Policy } from "@/modules/access";
import { GlossApprovalMethodRaw } from "../types";
import { approveAllUseCase } from "../use-cases/approveAll";
import { NotFoundError } from "@/shared/errors";

const requestSchema = z.object({
  verseId: z.string(),
  code: z.string(),
  phrases: z.array(
    z.object({
      id: z.coerce.number(),
      gloss: z.string(),
      method: z.nativeEnum(GlossApprovalMethodRaw).optional(),
    }),
  ),
});

const policy = new Policy({
  languageMember: true,
});

type Request = z.infer<typeof requestSchema>;

export const approveAll = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    if (!(data instanceof FormData)) {
      throw new Error("expected FormData");
    }

    return requestSchema.parse(parseForm(data));
  })
  .middleware([
    createPolicyMiddleware({
      policy,
      languageCodeField: "code",
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
      const logger = serverActionLogger("approveAll");

      try {
        await approveAllUseCase({
          languageCode: data.code,
          phrases: data.phrases,
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
      revalidatePath(`/${locale}/translate/${data.code}/${data.verseId}`);
    },
  );
