import { query } from "@/db";

export interface BookChaptersRow {
  bookId: number;
  chapters: number[];
}

const interlinearCoverageQueryService = {
  async findApprovedGlossChapters(
    languageId: string,
  ): Promise<BookChaptersRow[]> {
    const result = await query<BookChaptersRow>(
      `
        select
          v.book_id as "bookId",
          array_agg(distinct v.chapter order by v.chapter) as chapters
        from phrase ph
        join gloss g
          on g.phrase_id = ph.id
         and g.state = 'APPROVED'
        join phrase_word phw
          on phw.phrase_id = ph.id
        join word w
          on w.id = phw.word_id
        join verse v
          on v.id = w.verse_id
        where ph.language_id = $1
          and ph.deleted_at is null
        group by v.book_id
        order by v.book_id
      `,
      [languageId],
    );
    return result.rows;
  },
};

export default interlinearCoverageQueryService;
