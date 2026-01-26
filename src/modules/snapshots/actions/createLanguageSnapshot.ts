"use server";

import { FormState } from "@/components/Form";
import { parseForm } from "@/form-parser";
import { Policy } from "@/modules/access";
import { serverActionLogger } from "@/server-action";
import { verifySession } from "@/session";
import { enqueueJob } from "@/shared/jobs/enqueueJob";
import { notFound } from "next/navigation";
import * as z from "zod";
import { SNAPSHOT_JOB_TYPES } from "../jobs/jobTypes";
import { getLanguageByCodeReadModel } from "@/modules/languages/read-models/getLanguageByCodeReadModel";
import { snapshotQueryService } from "../data-access/snapshotQueryService";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";

const requestSchema = z.object({
  code: z.string(),
});

const policy = new Policy({
  systemRoles: [Policy.SystemRole.Admin],
});

export async function createLanguageSnapshotAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const logger = serverActionLogger("createLanguageSnapshot");

  const request = requestSchema.safeParse(parseForm(formData));
  if (!request.success) {
    logger.error("request parser error");
    return { state: "error" };
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

  const language = await getLanguageByCodeReadModel(request.data.code);
  if (!language) {
    logger.error(`language with code ${request.data.code} not found`);
    notFound();
  }

  const pendingSnapshot =
    await snapshotQueryService.findPendingSnapshotJobForLanguage({
      languageId: language.id,
    });
  if (!pendingSnapshot) {
    await enqueueJob(SNAPSHOT_JOB_TYPES.CREATE_SNAPSHOT, {
      languageId: language.id,
    });
  }

  const locale = await getLocale();
  revalidatePath(`/${locale}/admin/languages/${request.data.code}/snapshots`);

  return { state: "success" };
}
