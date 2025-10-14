"use server";

import { FormState } from "@/components/Form";
import { parseForm } from "@/form-parser";
import Policy from "@/modules/access/public/Policy";
import { serverActionLogger } from "@/server-action";
import { verifySession } from "@/session";
import { enqueueJob } from "@/shared/jobs/enqueueJob";
import { notFound } from "next/navigation";
import * as z from "zod";
import { SNAPSHOT_JOB_TYPES } from "../jobs/jobTypes";
import { snapshotQueryService } from "../data-access/snapshotQueryService";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";

const requestSchema = z.object({
  snapshotId: z.string(),
  code: z.string(),
});

const policy = new Policy({
  systemRoles: [Policy.SystemRole.Admin],
});

export async function restoreLanguageSnapshotAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const logger = serverActionLogger("restoreLanguageSnapshot");

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

  const snapshot = await snapshotQueryService.findForLanguageById(
    request.data.code,
    request.data.snapshotId,
  );
  if (!snapshot) {
    logger.error(
      `snapshot with id ${request.data.snapshotId} not found for language ${request.data.code}`,
    );
    notFound();
  }

  const pendingSnapshot =
    await snapshotQueryService.findPendingSnapshotJobForLanguage({
      languageId: snapshot.languageId,
    });
  if (!pendingSnapshot) {
    await enqueueJob(SNAPSHOT_JOB_TYPES.RESTORE_SNAPSHOT, {
      snapshotId: request.data.snapshotId,
      languageId: snapshot.languageId,
    });
  }

  const locale = await getLocale();
  revalidatePath(`/${locale}/admin/languages/${request.data.code}/snapshots`);

  return { state: "success" };
}
