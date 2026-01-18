"use server";

import * as z from "zod";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { verifySession } from "@/session";
import { Policy } from "@/modules/access";
import { FormState } from "@/components/Form";
import { serverActionLogger } from "@/server-action";
import bookQueryService from "../data-access/BookQueryService";
import languageLookupQueryService from "../data-access/LanguageLookupQueryService";
import RequestInterlinearExport, {
  ExportLanguageNotFoundError,
  NoBooksAvailableForExportError,
  NoChaptersAvailableForExportError,
} from "../use-cases/RequestInterlinearExport";
import { enqueueJob } from "@/shared/jobs/enqueueJob";

const exportPolicy = new Policy({
  systemRoles: [Policy.SystemRole.Admin],
  languageMember: true,
});

const requestSchema = z.object({
  languageCode: z.string().min(1),
});

type RequestInterlinearExportResult = FormState & {
  requestIds?: { id: string; bookId: number | null }[];
};

const requestInterlinearExportUseCase = new RequestInterlinearExport({
  bookQueryService,
  languageLookupQueryService,
  enqueueJob,
});

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
    const { jobId, bookId } = await requestInterlinearExportUseCase.execute({
      languageCode: parsed.data.languageCode,
      requestedBy: userId,
    });

    return {
      state: "success",
      requestIds: [{ id: jobId, bookId }],
    };
  } catch (error) {
    if (error instanceof ExportLanguageNotFoundError) {
      return {
        state: "error",
        validation: { languageCode: [t("errors.language_not_found")] },
      };
    }
    if (error instanceof NoBooksAvailableForExportError) {
      return {
        state: "error",
        validation: { bookIds: [t("errors.no_books_available")] },
      };
    }
    if (error instanceof NoChaptersAvailableForExportError) {
      return {
        state: "error",
        validation: { chapters: [t("errors.no_chapters_available")] },
      };
    }
    logger.error({ err: error }, "failed to request export");
    return { state: "error", error: t("errors.export_failed") };
  }
}

export default requestInterlinearExport;
