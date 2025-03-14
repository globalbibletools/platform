"use server";

import * as z from "zod";
import { getLocale } from "next-intl/server";
import { query } from "@/db";
import { parseForm } from "@/form-parser";
import { verifySession } from "@/session";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { serverActionLogger } from "@/server-action";

const requestSchema = z.object({
  code: z.string(),
});

export async function resetImport(formData: FormData): Promise<void> {
  const logger = serverActionLogger("resetImport");

  const locale = await getLocale();

  const session = await verifySession();
  if (!session) {
    logger.error("unauthorized");
    redirect(`${locale}/login`);
  }

  const request = requestSchema.safeParse(parseForm(formData));
  if (!request.success) {
    logger.error("request parse error");
    throw new Error("malformed request");
  }

  const languageQuery = await query<{ id: string; roles: string[] }>(
    `SELECT 
            l.id,
            (SELECT COALESCE(json_agg(r.role) FILTER (WHERE r.role IS NOT NULL), '[]') AS roles
            FROM language_member_role AS r WHERE r.language_id = l.id AND r.user_id = $2)
        FROM language AS l WHERE l.code = $1`,
    [request.data.code, session.user.id],
  );
  const language = languageQuery.rows[0];
  if (
    !language ||
    (!session?.user.roles.includes("ADMIN") &&
      !language.roles.includes("ADMIN"))
  ) {
    logger.error("unauthorized");
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
