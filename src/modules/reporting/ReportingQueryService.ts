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
}

export interface ReportingLanguage {
  id: string;
  name: string;
  code: string;
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
          name
        from users
      `,
      [],
    );
    return result.rows;
  },

  async findLanguages(): Promise<ReportingLanguage[]> {
    const result = await query<ReportingLanguage>(
      `
        select 
          id, 
          name,
          code
        from language
      `,
      [],
    );
    return result.rows;
  },
};
export default reportingQueryService;
