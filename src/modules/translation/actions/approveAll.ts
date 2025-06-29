"use server";

import * as z from "zod";
import { getLocale } from "next-intl/server";
import { parseForm } from "@/form-parser";
import { notFound } from "next/navigation";
import { verifySession } from "@/session";
import { revalidatePath } from "next/cache";
import { serverActionLogger } from "@/server-action";
import Policy from "@/modules/access/public/Policy";
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
  languageRoles: [Policy.LanguageRole.Translator],
});

export async function approveAll(formData: FormData): Promise<void> {
  const logger = serverActionLogger("approveAll");

  const request = requestSchema.safeParse(parseForm(formData));
  if (!request.success) {
    logger.error("request parse error");
    return;
  }

  const session = await verifySession();
  const authorized = await policy.authorize({
    actorId: session?.user.id,
    languageCode: request.data.code,
  });
  if (!authorized) {
    logger.error("unauthorized");
    notFound();
  }

  try {
    await approveAllUseCase({
      languageCode: request.data.code,
      phrases: request.data.phrases,
      userId: session!.user.id,
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      logger.error("not found");
      notFound();
    } else {
      throw error;
    }
  }

  const locale = await getLocale();
  revalidatePath(
    `/${locale}/translate/${request.data.code}/${request.data.verseId}`,
  );
}
