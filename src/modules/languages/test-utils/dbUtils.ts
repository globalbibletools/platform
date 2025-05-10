import { query } from "@/db";
import { DbLanguageRole } from "../data-access/types";

export async function findLanguageRolesForUser(
  userId: string,
): Promise<DbLanguageRole[]> {
  const result = await query<DbLanguageRole>(
    `
        select language_id as "languageId", user_id as "userId", role
        from language_member_role
        where user_id = $1
    `,
    [userId],
  );
  return result.rows;
}
