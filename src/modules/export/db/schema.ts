export interface GlossesSqliteExportTable {
  language_id: string;
  s3_key: string;
  sha256: string;
  size: number;
  updated_at: Date;
}
