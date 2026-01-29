export interface ExportInterlinearPdfJobPayload {
  languageId: string;
  languageCode: string;
  requestedBy: string;
}

export interface ExportInterlinearPdfJobData {
  exportKey?: string;
  downloadUrl?: string;
  expiresAt?: string;
  pages?: number;
}
