import { ulid } from "@/shared/ulid";
import { ExportLayout } from "../model";
import type bookQueryService from "../data-access/BookQueryService";
import type languageLookupQueryService from "../data-access/LanguageLookupQueryService";
import type exportRequestRepository from "../data-access/ExportRequestRepository";
import type { ExportBookSelection } from "../data-access/ExportRequestRepository";
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
  layout: ExportLayout;
  bookIds: number[] | null;
  chapters: number[] | null;
}

export interface RequestInterlinearExportResult {
  requestId: string;
  bookId: number | null;
  books: ExportBookSelection[];
}

export default class RequestInterlinearExport {
  constructor(
    private readonly deps: {
      bookQueryService: typeof bookQueryService;
      languageLookupQueryService: typeof languageLookupQueryService;
      exportRequestRepository: typeof exportRequestRepository;
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
    const selectedBookIds = request.bookIds ?? allBooks.map((book) => book.id);
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

      const chapters =
        request.chapters ?
          request.chapters.filter((chapter) => available.includes(chapter))
        : available;
      if (chapters.length === 0) {
        continue;
      }
      books.push({ bookId, chapters });
    }

    if (books.length === 0) {
      throw new NoChaptersAvailableForExportError();
    }

    const requestId = ulid();
    await this.deps.exportRequestRepository.createInterlinearRequest({
      requestId,
      languageId: language.id,
      requestedBy: request.requestedBy,
      layout: request.layout,
      books,
    });

    await this.deps.enqueueJob(EXPORT_JOB_TYPES.EXPORT_INTERLINEAR_PDF, {
      requestId,
      languageCode: request.languageCode,
      books,
      layout: request.layout,
    });

    return {
      requestId,
      bookId: books.length === 1 ? books[0].bookId : null,
      books,
    };
  }
}
