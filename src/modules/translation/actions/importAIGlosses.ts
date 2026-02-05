"use server";

import * as z from "zod";
import { getLocale } from "next-intl/server";
import { FormState } from "@/components/Form";
import { parseForm } from "@/form-parser";
import { verifySession } from "@/session";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { serverActionLogger } from "@/server-action";
import { Policy } from "@/modules/access";
import { NotFoundError } from "@/shared/errors";
import { enqueueAIGlossImportJob } from "../use-cases/enqueueAIGlossImportJob";

const requestSchema = z.object({
  code: z.string(),
});

const policy = new Policy({ systemRoles: [Policy.SystemRole.Admin] });

export async function importAIGlosses(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const logger = serverActionLogger("importAIGlosses");

  const locale = await getLocale();

  const session = await verifySession();
  const isAuthorized = policy.authorize({
    actorId: session?.user.id,
  });
  if (!isAuthorized) {
    logger.error("unauthorized");
    redirect(`${locale}/login`);
  }

  const request = requestSchema.safeParse(parseForm(formData));
  if (!request.success) {
    logger.error("request parse error");
    return {
      state: "error",
    };
  }

  try {
    await enqueueAIGlossImportJob({
      languageCode: request.data.code,
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      logger.error("not found");
      notFound();
    }
    throw error;
  }

  revalidatePath(`/${locale}/admin/languages/${request.data.code}/import`);

  return { state: "success" };
}
