"use server";

import * as z from "zod";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { verifySession } from "@/session";
import { Policy } from "@/modules/access";
import { FormState } from "@/components/Form";
import { serverActionLogger } from "@/server-action";
import { requestInterlinearExport as requestInterlinearExportUseCase } from "../use-cases/requestInterlinearExport";
import { revalidatePath } from "next/cache";

const exportPolicy = new Policy({
  systemRoles: [Policy.SystemRole.Admin],
  languageMember: true,
});

const requestSchema = z.object({
  languageCode: z.string().min(1),
});

type RequestInterlinearExportResult = FormState;

export async function requestInterlinearExport(
  arg1: FormState | FormData,
  arg2?: FormData,
): Promise<RequestInterlinearExportResult> {
  const formData = arg2 ?? (arg1 as FormData);
  const logger = serverActionLogger("requestInterlinearExport");
  const t = await getTranslations("InterlinearExport");

  const session = await verifySession();
  const userId = session?.user.id;
  if (!userId) notFound();

  const parsed = requestSchema.safeParse(
    {
      languageCode: formData.get("languageCode"),
    },
    {
      errorMap: (error) => {
        if (error.path.toString() === "languageCode") {
          return { message: t("errors.language_required") };
        }
        return { message: t("errors.invalid") };
      },
    },
  );

  if (!parsed.success) {
    logger.error("request parse error");
    return {
      state: "error",
      validation: parsed.error.flatten().fieldErrors,
    };
  }

  const authorized = await exportPolicy.authorize({
    actorId: userId,
    languageCode: parsed.data.languageCode,
  });

  if (!authorized) {
    logger.error("unauthorized");
    notFound();
  }

  try {
    await requestInterlinearExportUseCase({
      languageCode: parsed.data.languageCode,
      requestedBy: userId,
    });
  } catch (error) {
    logger.error({ err: error }, "failed to request export");
    return { state: "error", error: t("errors.export_failed") };
  }

  const locale = await getLocale();
  revalidatePath(
    `/${locale}/admin/languages/${parsed.data.languageCode}/exports`,
  );

  return {
    state: "success",
  };
}

export default requestInterlinearExport;
