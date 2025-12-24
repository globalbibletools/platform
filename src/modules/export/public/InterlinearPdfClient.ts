import interlinearCoverageQueryService, {
  type BookChaptersRow,
} from "../data-access/InterlinearCoverageQueryService";
import bookQueryService, {
  type BookRow,
} from "../data-access/BookQueryService";
import interlinearQueryService, {
  type InterlinearChapterResult,
} from "../data-access/InterlinearQueryService";
import {
  generateInterlinearPdf,
  type GeneratedPdf,
  type PdfGeneratorOptions,
} from "../pdf/InterlinearPdfGenerator";

export type ApprovedGlossChaptersByBook = BookChaptersRow;
export type {
  BookRow,
  InterlinearChapterResult,
  GeneratedPdf,
  PdfGeneratorOptions,
};

export const interlinearPdfClient = {
  async findApprovedGlossChapters(
    languageId: string,
  ): Promise<ApprovedGlossChaptersByBook[]> {
    return interlinearCoverageQueryService.findApprovedGlossChapters(
      languageId,
    );
  },

  async findAllBooks(): Promise<BookRow[]> {
    return bookQueryService.findAll();
  },

  async fetchChapters(
    bookId: number,
    chapters: number[],
    languageCode: string,
  ): Promise<InterlinearChapterResult> {
    return interlinearQueryService.fetchChapters(
      bookId,
      chapters,
      languageCode,
    );
  },

  generateInterlinearPdf(
    chapter: InterlinearChapterResult,
    options: PdfGeneratorOptions,
  ): GeneratedPdf {
    return generateInterlinearPdf(chapter, options);
  },
};
