import { query, transaction } from "@/db";
import { ExportLayout, ExportRequestStatusRaw } from "../model";

export interface ExportBookSelection {
  bookId: number;
  chapters: number[];
}

export interface ExportRequestStatusResult {
  id: string;
  status: ExportRequestStatusRaw;
  bookId: number | null;
  downloadUrl: string | null;
  expiresAt: Date | null;
  languageCode: string;
}

const exportRequestRepository = {
  async createInterlinearRequest({
    requestId,
    languageId,
    requestedBy,
    layout,
    books,
  }: {
    requestId: string;
    languageId: string;
    requestedBy: string;
    layout: ExportLayout;
    books: ExportBookSelection[];
  }): Promise<void> {
    const singleBook = books.length === 1 ? books[0] : null;

    await transaction(async (q) => {
      await q(
        `
          insert into export_request (
            id,
            language_id,
            book_id,
            chapters,
            layout,
            status,
            requested_by,
            requested_at
          )
          values (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            now()
          )
        `,
        [
          requestId,
          languageId,
          singleBook?.bookId ?? null,
          singleBook?.chapters ?? null,
          layout,
          ExportRequestStatusRaw.Pending,
          requestedBy,
        ],
      );

      for (const book of books) {
        await q(
          `
            insert into export_request_book (request_id, book_id, chapters)
            values ($1, $2, $3)
          `,
          [requestId, book.bookId, book.chapters],
        );
      }
    });
  },

  async findStatus(
    requestId: string,
  ): Promise<ExportRequestStatusResult | undefined> {
    const result = await query<ExportRequestStatusResult>(
      `
        select er.id,
               er.status,
               er.book_id as "bookId",
               er.download_url as "downloadUrl",
               er.expires_at as "expiresAt",
               l.code as "languageCode"
        from export_request er
        join language l on l.id = er.language_id
        where er.id = $1
        limit 1
      `,
      [requestId],
    );
    return result.rows[0];
  },

  async loadBooks(
    requestId: string,
  ): Promise<{ bookId: number; chapters: number[] }[]> {
    const result = await query<{ bookId: number; chapters: number[] }>(
      `
        select erb.book_id as "bookId",
               erb.chapters
        from export_request_book erb
        where erb.request_id = $1
        order by erb.book_id
      `,
      [requestId],
    );
    return result.rows;
  },

  async markInProgress({
    requestId,
    jobId,
    exportKey,
  }: {
    requestId: string;
    jobId: string;
    exportKey: string;
  }): Promise<{ exportKey: string }> {
    const result = await query<{ exportKey: string }>(
      `
        update export_request
        set status = $1,
            job_id = $2,
            export_key = coalesce(export_key, $3)
        where id = $4
        returning export_key as "exportKey"
      `,
      [ExportRequestStatusRaw.InProgress, jobId, exportKey, requestId],
    );
    const row = result.rows[0];
    if (!row?.exportKey) {
      throw new Error(`export request ${requestId} not found`);
    }
    return row;
  },

  async markComplete({
    requestId,
    downloadUrl,
    expiresAt,
  }: {
    requestId: string;
    downloadUrl: string;
    expiresAt: Date;
  }): Promise<void> {
    await query(
      `
        update export_request
        set status = $1,
            download_url = $2,
            expires_at = $3,
            completed_at = now()
        where id = $4
      `,
      [ExportRequestStatusRaw.Complete, downloadUrl, expiresAt, requestId],
    );
  },

  async markFailed(requestId: string): Promise<void> {
    await query(
      `
        update export_request
        set status = $1,
            completed_at = now()
        where id = $2
      `,
      [ExportRequestStatusRaw.Failed, requestId],
    );
  },
};

export default exportRequestRepository;
