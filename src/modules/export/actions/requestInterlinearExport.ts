"use server";

import * as z from "zod";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { verifySession } from "@/session";
import Policy from "@/modules/access/public/Policy";
import { FormState } from "@/components/Form";
import { serverActionLogger } from "@/server-action";
import bookQueryService from "../data-access/BookQueryService";
import exportRequestRepository from "../data-access/ExportRequestRepository";
import languageLookupQueryService from "../data-access/LanguageLookupQueryService";
import RequestInterlinearExport, {
  ExportLanguageNotFoundError,
  NoBooksAvailableForExportError,
  NoChaptersAvailableForExportError,
} from "../use-cases/RequestInterlinearExport";
import { enqueueJob } from "@/shared/jobs/enqueueJob";
import { ExportLayout } from "../model";

const exportPolicy = new Policy({
  systemRoles: [Policy.SystemRole.Admin],
  languageRoles: [Policy.LanguageRole.Admin, Policy.LanguageRole.Translator],
});

const requestSchema = z.object({
  languageCode: z.string().min(1),
  layout: z.enum(["standard", "parallel"]).default("standard"),
});

type RequestInterlinearExportResult = FormState & {
  requestIds?: { id: string; bookId: number | null }[];
};

const requestInterlinearExportUseCase = new RequestInterlinearExport({
  bookQueryService,
  languageLookupQueryService,
  exportRequestRepository,
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
      layout: formData.get("layout") ?? undefined,
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

  const parsedChapters = parseChapters(formData.get("chapters"));
  if (!parsedChapters.success) {
    return {
      state: "error",
      validation: { chapters: [t(`errors.${parsedChapters.errorKey}`)] },
    };
  }

  const parsedBooks = parseBookIds(formData.get("bookIds"));
  if (!parsedBooks.success) {
    return {
      state: "error",
      validation: { bookIds: [t(`errors.${parsedBooks.errorKey}`)] },
    };
  }

  try {
    const { requestId, bookId } = await requestInterlinearExportUseCase.execute(
      {
        languageCode: parsed.data.languageCode,
        requestedBy: userId,
        bookIds: parsedBooks.bookIds,
        chapters: parsedChapters.chapters,
        layout: parsed.data.layout,
      },
    );

    return {
      state: "success",
      requestIds: [{ id: requestId, bookId }],
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

type ChaptersParseErrorKey =
  | "chapters_range_invalid"
  | "chapters_numeric_or_ranges"
  | "chapters_positive"
  | "chapters_required_or_blank";

function parseChapters(
  chapters: FormDataEntryValue | null,
):
  | { success: true; chapters: number[] | null }
  | { success: false; errorKey: ChaptersParseErrorKey } {
  const raw = typeof chapters === "string" ? chapters : "";
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { success: true, chapters: null };
  }

  const chaptersList: number[] = [];
  const parts = trimmed
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  for (const part of parts) {
    const rangeMatch = part.match(/^([0-9]+)-([0-9]+)$/);
    if (rangeMatch) {
      const start = Number(rangeMatch[1]);
      const end = Number(rangeMatch[2]);
      if (start <= 0 || end <= 0 || start > end) {
        return {
          success: false,
          errorKey: "chapters_range_invalid",
        };
      }
      for (let i = start; i <= end; i += 1) {
        chaptersList.push(i);
      }
      continue;
    }

    if (!/^[0-9]+$/.test(part)) {
      return { success: false, errorKey: "chapters_numeric_or_ranges" };
    }
    const value = Number(part);
    if (value <= 0) {
      return {
        success: false,
        errorKey: "chapters_positive",
      };
    }
    chaptersList.push(value);
  }

  if (chaptersList.length === 0) {
    return {
      success: false,
      errorKey: "chapters_required_or_blank",
    };
  }

  const unique = Array.from(new Set(chaptersList)).sort((a, b) => a - b);
  return { success: true, chapters: unique };
}

type BookIdsParseErrorKey = "books_numeric_ids" | "books_required";

function parseBookIds(
  bookIds: FormDataEntryValue | null,
):
  | { success: true; bookIds: number[] | null }
  | { success: false; errorKey: BookIdsParseErrorKey } {
  const raw = typeof bookIds === "string" ? bookIds : "";
  const parts = raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return { success: true, bookIds: null };
  }

  const invalid = parts.filter((part) => !/^[0-9]+$/.test(part));
  if (invalid.length > 0) {
    return { success: false, errorKey: "books_numeric_ids" };
  }

  const unique = Array.from(new Set(parts.map((part) => Number(part)))).filter(
    (id) => id > 0,
  );
  if (unique.length === 0) {
    return { success: false, errorKey: "books_required" };
  }

  return { success: true, bookIds: unique };
}

export default requestInterlinearExport;
