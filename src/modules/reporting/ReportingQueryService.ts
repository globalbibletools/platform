import { query } from "@/db";

export interface LanguageContributions {
  week: Date;
  users: Array<{ userId: string; glosses: number }>;
}

export interface ReportingContribution {
  id: string;
  week: Date;
  languageId: string;
  userId: string;
  approvedCount: number;
  revokedCount: number;
  editedApprovedCount: number;
  editedUnapprovedCount: number;
}

export interface ReportingUser {
  id: string;
  name: string;
  email: string;
  status: string;
}

export interface ReportingLanguage {
  id: string;
  englishName: string;
  localName: string;
  code: string;
}

export interface ReportingBook {
  id: string;
  name: string;
  wordCount: number;
}

export interface ReportingProgressSnapshot {
  id: string;
  week: Date;
  languageId: string;
  userId?: string;
  bookId: string;
  approvedCount: string;
  unapprovedCount: string;
}

export interface ApprovalStats {
  chunkId: number;
  languageId: string;
  method: string;
  chunkCount: number;
  cumulativeCount: number;
  language: string;
}

const reportingQueryService = {
  async findContributionsByLanguageId({
    languageId,
    limit,
  }: {
    languageId: string;
    limit: number;
  }): Promise<LanguageContributions[]> {
    const result = await query<LanguageContributions>(
      `
        select
		  week.date as week,
          coalesce(
            json_agg(
              json_build_object(
                'glosses', s.approved_count,
                'userId', s.user_id
              )
            ) filter (where s.user_id is not null),
            '[]'::json
          ) as users
		from (
          select
            (current_date - extract(dow from current_date) * interval '1 day')
              - interval '7 days' * generate_series(0, $2) as date
		) as week
		left join weekly_contribution_statistics s
          on s.week = week.date and s.language_id = $1
		group by week.date
        order by week.date;
      `,
      [languageId, limit - 1],
    );
    return result.rows;
  },

  async findContributions(): Promise<ReportingContribution[]> {
    const result = await query<ReportingContribution>(
      `
        select 
          id, 
          week, 
          language_id as "languageId", 
          user_id as "userId", 
          approved_count as "approvedCount", 
          revoked_count as "revokedCount", 
          edited_approved_count as "editedApprovedCount", 
          edited_unapproved_count as "editedUnapprovedCount" 
        from weekly_contribution_statistics
        order by week desc, user_id, language_id
      `,
      [],
    );
    return result.rows;
  },

  async findUsers(): Promise<ReportingUser[]> {
    const result = await query<ReportingUser>(
      `
        select 
          id, 
          name,
          email,
          case invite.is_invited
            when true then 'invited'
            else 'active'
          end as status
        from users as u
        left join lateral (
            select count(*) > 0 as is_invited
            from user_invitation i
            where i.user_id = u.id
        ) as invite on true
        where u.status <> 'disabled'
      `,
      [],
    );
    return result.rows;
  },

  async findLanguages(): Promise<ReportingLanguage[]> {
    const result = await query<ReportingLanguage>(
      `select id, english_name as "englishName", local_name as "localName", code from language`,
      [],
    );
    return result.rows;
  },

  async findBooks(): Promise<ReportingBook[]> {
    const result = await query<ReportingBook>(
      `
        select 
          id, 
          name,
          words.count as "wordCount"
        from book
        join lateral (
            select count(*) as count from word
            where exists (
                select * from verse
                where verse.book_id = book.id
                    and word.verse_id = verse.id
            )
        ) as words on true
        order by book.id
      `,
      [],
    );
    return result.rows;
  },

  async findProgressSnapshots(): Promise<ReportingProgressSnapshot[]> {
    const result = await query<ReportingProgressSnapshot>(
      `
        select 
            id,
            week,
            language_id as "languageId",
            user_id as "userId",
            book_id as "bookId",
            approved_count as "approvedCount",
            unapproved_count as "unapprovedCount"
        from weekly_gloss_statistics
        order by week desc, language_id, book_id, user_id
      `,
      [],
    );
    return result.rows;
  },

  async findApprovalStats(): Promise<ApprovalStats[]> {
    const result = await query<ApprovalStats>(
      `
        with data as (
          select
            language_id,
            data->>'method' as method,
			case when book.book_id < 40 then 'hebrew' else 'greek' end as language,
            created_at,
            row_number() over (
              partition by language_id, book_id < 40
              order by created_at
            ) as rn
          from tracking_event
		  join lateral (
			select verse.book_id from phrase_word
			join word on phrase_word.word_id = word.id
			join verse on verse.id = word.verse_id
			where phrase_word.phrase_id = (data->>'phraseId')::integer
			limit 1
		  ) as book on true
        ),
        bucketed_data as (
          select *,
            (rn - 1) / 1000 as chunk_id
          from data
        ),
        chunk_counts as (
          select
            language_id as "languageId",
            chunk_id as "chunkId",
            method,
			language,
            count(*) as "chunkCount"
          from bucketed_data
          group by "languageId", "chunkId", method, language
        )
        select
          cc.*,
          sum("chunkCount") over (
            partition by "languageId", method, language
            order by "chunkId"
            rows between unbounded preceding and current row
          ) as "cumulativeCount"
        from chunk_counts cc
        order by "languageId", "chunkId", language desc, method;
      `,
      [],
    );

    return result.rows;
  },
};
export default reportingQueryService;
