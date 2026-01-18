export type ExportLayout = "standard" | "parallel";

export interface ExportBookSelection {
  bookId: number;
  chapters: number[];
}

export interface ExportInterlinearPdfJobPayload {
  languageId: string;
  languageCode: string;
  requestedBy: string;
  books: ExportBookSelection[];
  layout: ExportLayout;
}

export interface ExportInterlinearPdfJobData {
  exportKey?: string;
  downloadUrl?: string;
  expiresAt?: string;
  pages?: number;
}
