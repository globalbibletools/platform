"use server";

import * as z from "zod";
import { getTranslations, getLocale } from "next-intl/server";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { query } from "@/db";
import { FormState } from "@/components/Form";
import { parseForm } from "@/form-parser";
import { verifySession } from "@/session";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { serverActionLogger } from "@/server-action";
import { Policy } from "@/modules/access";

const requestSchema = z.object({
  code: z.string(),
  language: z.string(),
});

const policy = new Policy({ systemRoles: [Policy.SystemRole.Admin] });

export async function importLanguage(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const logger = serverActionLogger("importLanguage");

  const t = await getTranslations("LanguageImportPage");
  const locale = await getLocale();

  const session = await verifySession();
  const isAuthorized = policy.authorize({
    actorId: session?.user.id,
  });
  if (!isAuthorized) {
    logger.error("unauthorized");
    redirect(`${locale}/login`);
  }

  const request = requestSchema.safeParse(parseForm(formData), {
    errorMap: (error) => {
      if (error.path.toString() === "language") {
        return { message: t("errors.language_required") };
      } else {
        return { message: "Invalid" };
      }
    },
  });
  if (!request.success) {
    logger.error("request parse error");
    return {
      state: "error",
      validation: request.error.flatten().fieldErrors,
    };
  }

  const languageQuery = await query<{ id: string }>(
    `select id from language where code = $1`,
    [request.data.code],
  );
  const language = languageQuery.rows[0];
  if (!language) {
    logger.error("not found");
    notFound();
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
    [language.id, session!.user.id],
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
          MessageGroupId: request.data.code,
          MessageBody: JSON.stringify({
            languageCode: request.data.code,
            importLanguage: request.data.language,
          }),
        }),
      );
    } else {
      logger.info(
        {
          sourceLanguage: request.data.language,
          targetLanguage: request.data.code,
        },
        "Starting import",
      );
    }
  }

  revalidatePath(`/${locale}/admin/languages/${request.data.code}/import`);

  return { state: "success" };
}
