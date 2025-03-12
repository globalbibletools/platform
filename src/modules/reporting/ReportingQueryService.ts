import { query } from "@/db";

export interface ContributionRecord {
  week: Date;
  approvedCount: number;
  revokedCount: number;
  editedApprovedCount: number;
  editedUnapprovedCount: number;
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
};
export default reportingQueryService;
