import * as z from "zod";
import { getLocale } from "next-intl/server";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { query } from "@/db";
import { parseForm } from "@/form-parser";
import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { revalidatePath } from "next/cache";
import { serverActionLogger } from "@/server-action";
import { createPolicyMiddleware, Policy } from "@/modules/access";

const requestSchema = z.object({
  code: z.string(),
  language: z.string(),
});

const policy = new Policy({ systemRoles: [Policy.SystemRole.Admin] });

export const importLanguage = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    if (!(data instanceof FormData)) {
      throw new Error("expected FormData");
    }

    return requestSchema.parse(parseForm(data));
  })
  .middleware([createPolicyMiddleware({ policy })])
  .handler(
    async ({
      data,
      context,
    }: {
      data: z.infer<typeof requestSchema>;
      context: { session: { user: { id: string } } };
    }) => {
      const logger = serverActionLogger("importLanguage");

      const languageQuery = await query<{ id: string }>(
        `select id from language where code = $1`,
        [data.code],
      );
      const language = languageQuery.rows[0];
      if (!language) {
        logger.error("not found");
        throw notFound();
      }

      const result = await query(
        `
        INSERT INTO language_import_job AS job (language_id, start_date, user_id)
        VALUES ($1, NOW(), $2)
        ON CONFLICT (language_id) DO UPDATE SET
            start_date = NOW(),
            end_date = NULL,
            succeeded = NULL,
            user_id = $2
        WHERE job.succeeded IS NOT NULL
        `,
        [language.id, context.session.user.id],
      );

      if ((result.rowCount ?? 0) > 0) {
        if (process.env.NODE_ENV === "production") {
          const sqsClient = new SQSClient({
            credentials: {
              accessKeyId: process.env.ACCESS_KEY_ID ?? "",
              secretAccessKey: process.env.SECRET_ACCESS_KEY ?? "",
            },
          });
          await sqsClient.send(
            new SendMessageCommand({
              QueueUrl: process.env.LANGUAGE_IMPORT_QUEUE_URL,
              MessageGroupId: data.code,
              MessageBody: JSON.stringify({
                languageCode: data.code,
                importLanguage: data.language,
              }),
            }),
          );
        } else {
          logger.info(
            {
              sourceLanguage: data.language,
              targetLanguage: data.code,
            },
            "Starting import",
          );
        }
      }

      const locale = await getLocale();
      revalidatePath(`/${locale}/admin/languages/${data.code}/import`);

      return { state: "success" };
    },
  );
