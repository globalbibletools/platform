import * as z from "zod";
import { getLocale } from "next-intl/server";
import { query } from "@/db";
import { parseForm } from "@/form-parser";
import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { revalidatePath } from "next/cache";
import { serverActionLogger } from "@/server-action";
import { createPolicyMiddleware, Policy } from "@/modules/access";

const requestSchema = z.object({
  code: z.string(),
});

const policy = new Policy({ systemRoles: [Policy.SystemRole.Admin] });

export const resetImport = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    if (!(data instanceof FormData)) {
      throw new Error("expected FormData");
    }

    return requestSchema.parse(parseForm(data));
  })
  .middleware([createPolicyMiddleware({ policy })])
  .handler(async ({ data }) => {
    const logger = serverActionLogger("resetImport");

    const languageQuery = await query<{ id: string }>(
      `select id from language where code = $1`,
      [data.code],
    );
    const language = languageQuery.rows[0];
    if (!language) {
      logger.error("not found");
      throw notFound();
    }

    await query(
      `
        DELETE FROM language_import_job
        WHERE language_id = $1
        `,
      [language.id],
    );

    const locale = await getLocale();
    revalidatePath(`/${locale}/admin/languages/${data.code}/import`);
  });
