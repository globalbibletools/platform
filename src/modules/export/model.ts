export interface ExportInterlinearPdfJobPayload {
  languageId: string;
  languageCode: string;
  requestedBy: string;
}

export interface ExportInterlinearPdfJobData {
  exportKey?: string;
  downloadUrl?: string;
  pages?: number;
}

export interface QueueGithubExportRunJobPayload {
  windowDays?: number;
}

export interface ExportLanguageBlobsJobPayload {
  languageCodes: Array<string>;
}

export interface GithubTreeItem {
  path: string;
  mode: "100644" | "100755" | "040000" | "160000" | "120000";
  type: "blob" | "tree" | "commit";
  sha: string;
}

export interface ExportLanguageBlobsJobData {
  treeItems: GithubTreeItem[];
}
