"use server";

import * as z from "zod";
import { getLocale } from "next-intl/server";
import { query } from "@/db";
import { parseForm } from "@/form-parser";
import { verifySession } from "@/session";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { serverActionLogger } from "@/server-action";
import { Policy } from "@/modules/access";

const requestSchema = z.object({
  code: z.string(),
});

const policy = new Policy({ systemRoles: [Policy.SystemRole.Admin] });

export async function resetImport(formData: FormData): Promise<void> {
  const logger = serverActionLogger("resetImport");

  const locale = await getLocale();

  const session = await verifySession();
  const isAuthorized = await policy.authorize({ actorId: session?.user.id });
  if (!isAuthorized) {
    logger.error("unauthorized");
    redirect(`${locale}/login`);
  }

  const request = requestSchema.safeParse(parseForm(formData));
  if (!request.success) {
    logger.error("request parse error");
    throw new Error("malformed request");
  }

  const languageQuery = await query<{ id: string; roles: string[] }>(
    `select id, from language as where code = $1`,
    [request.data.code, session!.user.id],
  );
  const language = languageQuery.rows[0];
  if (!language) {
    logger.error("not found");
    notFound();
  }

  await query(
    `
        DELETE FROM language_import_job
        WHERE language_id = $1
        `,
    [language.id],
  );

  revalidatePath(`/${locale}/admin/languages/${request.data.code}/import`);
}
