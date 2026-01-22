"use server";

import { parseForm } from "@/form-parser";
import { Policy } from "@/modules/access";
import { serverActionLogger } from "@/server-action";
import { verifySession } from "@/session";
import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
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

export async function updateGlossAction(formData: FormData): Promise<any> {
  const logger = serverActionLogger("updateGloss");

  const request = requestSchema.safeParse(parseForm(formData));
  if (!request.success) {
    logger.error("request parse error");
    return;
  }

  const session = await verifySession();
  const authorized = await policy.authorize({
    actorId: session?.user.id,
    languageCode: request.data.languageCode,
  });
  if (!authorized) {
    logger.error("unauthorized");
    notFound();
  }

  try {
    await updateGlossUseCase({
      ...request.data,
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
    `/${locale}/translate/${request.data.languageCode}/${request.data.verseId}`,
  );
}
