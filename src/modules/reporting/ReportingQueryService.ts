import { query } from "@/db";

export interface ContributionRecord {
  week: Date;
  approvedCount: number;
  revokedCount: number;
  editedApprovedCount: number;
  editedUnapprovedCount: number;
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
  name: string;
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
  userId: string;
  bookId: string;
  approvedCount: string;
  unapprovedCount: string;
}

const reportingQueryService = {
  async findContributionsByUserId(
    userId: string,
  ): Promise<ContributionRecord[]> {
    const result = await query<ContributionRecord>(
      `
        select
          week,
          sum(approved_count) as "approvedCount",
          sum(revoked_count) as "revokedCount",
          sum(edited_approved_count) as "editedApprovedCount", 
          sum(edited_unapproved_count) as "editedUnapprovedCount"
        from weekly_contribution_statistics
        where user_id = $1
        group by week;
      `,
      [userId],
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
            select true as is_invited
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
      `select id, name, code from language`,
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
};
export default reportingQueryService;
