import { query } from "@/db";

export interface BookRow {
  id: number;
  name: string;
}

export interface BookChaptersRow {
  bookId: number;
  chapters: number[];
}

const bookQueryService = {
  async findAll(): Promise<BookRow[]> {
    const result = await query<BookRow>(
      `select id, name from book order by id asc`,
      [],
    );
    return result.rows;
  },

  async findChapters(bookIds: number[]): Promise<BookChaptersRow[]> {
    if (bookIds.length === 0) return [];

    const result = await query<BookChaptersRow>(
      `
        select book_id as "bookId",
               array_agg(distinct chapter order by chapter) as chapters
        from verse
        where book_id = any($1)
        group by book_id
        order by book_id
      `,
      [bookIds],
    );

    return result.rows;
  },
};

export default bookQueryService;
