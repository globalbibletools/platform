import { ExportBookSelection } from "../model";
import type bookQueryService from "../data-access/BookQueryService";
import type languageLookupQueryService from "../data-access/LanguageLookupQueryService";
import type { enqueueJob } from "@/shared/jobs/enqueueJob";
import { EXPORT_JOB_TYPES } from "../jobs/jobTypes";

export class NoBooksAvailableForExportError extends Error {}
export class NoChaptersAvailableForExportError extends Error {}
export class ExportLanguageNotFoundError extends Error {
  constructor(readonly languageCode: string) {
    super();
  }
}

export interface RequestInterlinearExportRequest {
  languageCode: string;
  requestedBy: string;
}

export interface RequestInterlinearExportResult {
  jobId: string;
  bookId: number | null;
  books: ExportBookSelection[];
}

export default class RequestInterlinearExport {
  constructor(
    private readonly deps: {
      bookQueryService: typeof bookQueryService;
      languageLookupQueryService: typeof languageLookupQueryService;
      enqueueJob: typeof enqueueJob;
    },
  ) {}

  async execute(
    request: RequestInterlinearExportRequest,
  ): Promise<RequestInterlinearExportResult> {
    const language = await this.deps.languageLookupQueryService.findByCode(
      request.languageCode,
    );
    if (!language) {
      throw new ExportLanguageNotFoundError(request.languageCode);
    }

    const allBooks = await this.deps.bookQueryService.findAll();
    const selectedBookIds = allBooks.map((book) => book.id);
    if (selectedBookIds.length === 0) {
      throw new NoBooksAvailableForExportError();
    }

    const chaptersByBookRows =
      await this.deps.bookQueryService.findChapters(selectedBookIds);
    const chaptersByBook = new Map(
      chaptersByBookRows.map((row) => [row.bookId, row.chapters]),
    );

    const books: ExportBookSelection[] = [];
    for (const bookId of selectedBookIds) {
      const available = chaptersByBook.get(bookId) ?? [];
      if (available.length === 0) {
        continue;
      }

      const chapters = available;
      if (chapters.length === 0) {
        continue;
      }
      books.push({ bookId, chapters });
    }

    if (books.length === 0) {
      throw new NoChaptersAvailableForExportError();
    }

    const job = await this.deps.enqueueJob(
      EXPORT_JOB_TYPES.EXPORT_INTERLINEAR_PDF,
      {
        languageId: language.id,
        languageCode: request.languageCode,
        requestedBy: request.requestedBy,
        books,
        layout: "standard",
      },
    );

    return {
      jobId: job.id,
      bookId: books.length === 1 ? books[0].bookId : null,
      books,
    };
  }
}
