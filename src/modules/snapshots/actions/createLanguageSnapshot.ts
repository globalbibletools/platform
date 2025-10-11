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
import { snapshotRepository } from "../data-access/SnapshotRepository";
import { ulid } from "@/shared/ulid";
import { Snapshot } from "../model";
import { languageQueryService } from "@/modules/languages/data-access/LanguageQueryService";
import { CreateSnapshotJob } from "../jobs/createSnapshotJob";

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

  // TODO: confirm snapshot is not already in progress
  const language = await languageQueryService.findByCode(request.data.code);
  if (!language) {
    logger.error(`language with code ${request.data.code} not found`);
    notFound();
  }

  await enqueueJob(SNAPSHOT_JOB_TYPES.CREATE_SNAPSHOT, {
    languageId: language.id,
  });

  return { state: "success" };
}
