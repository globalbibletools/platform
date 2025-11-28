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
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";

const requestSchema = z.object({
  snapshotKey: z.string(),
  code: z.string(),
});

const policy = new Policy({
  systemRoles: [Policy.SystemRole.Admin],
});

export async function importLanguageSnapshotAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const logger = serverActionLogger("importLanguageSnapshot");

  const request = requestSchema.safeParse(parseForm(formData));
  if (!request.success) {
    logger.error("request parser error");
    return { state: "error" };
  }

  const session = await verifySession();
  const authorized = await policy.authorize({
    actorId: session?.user.id,
  });
  if (!authorized) {
    logger.error("unauthorized");
    notFound();
  }

  await enqueueJob(SNAPSHOT_JOB_TYPES.IMPORT_SNAPSHOT, {
    snapshotKey: request.data.snapshotKey,
    code: request.data.code,
  });

  const locale = await getLocale();
  revalidatePath(`/${locale}/admin/languages/import`);

  return { state: "success" };
}
