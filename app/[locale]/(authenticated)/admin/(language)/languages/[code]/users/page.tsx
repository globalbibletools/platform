import Button from "@/app/components/Button";
import { Icon } from "@/app/components/Icon";
import { List, ListBody, ListCell, ListHeader, ListHeaderCell, ListRow } from "@/app/components/List";
import ViewTitle from "@/app/components/ViewTitle";
import { query } from "@/app/db";
import { getTranslations } from "next-intl/server";
import RoleSelector from "./RoleSelector";
import RemoveUserButton from "./RemoveUserButton";

interface LanguageUsersPageProps {
    params: { code: string }
}

export default async function LanguageUsersPage({ params }: LanguageUsersPageProps) {
    const t = await getTranslations('LanguageUsersPage')
    const usersQuery = await query<{ id: string, name: string, email: string, roles: string[] }>(
        `SELECT
            u.id, u.name, u.email,
            COALESCE(json_agg(r.role) FILTER (WHERE r.role IS NOT NULL AND r.role != 'VIEWER'), '[]') AS roles
        FROM "LanguageMemberRole" AS r
        JOIN "User" AS u ON u.id = r."userId"
        JOIN "Language" AS l ON l.id = r."languageId"
        WHERE l.code = $1
        GROUP BY u.id
        `,
        [params.code]
    )

  return (
    <div className="px-8 py-6 w-fit">
      <div className="flex items-baseline mb-4">
        <ViewTitle>
          {t('title')}
        </ViewTitle>
        <div className="flex-grow" />
          <Button
            href="./users/invite"
            variant="primary"
          >
            <Icon icon="plus" className="me-1" />
            {t('links.invite_user')}
          </Button>
      </div>
      <List>
        <ListHeader>
          <ListHeaderCell className="min-w-[120px]">
            {t('headers.name')}
          </ListHeaderCell>
          <ListHeaderCell className="min-w-[80px] ps-4">
            {t('headers.role')}
          </ListHeaderCell>
          <ListHeaderCell />
        </ListHeader>
        <ListBody>
          {usersQuery.rows.map((user) => (
            <ListRow key={user.id}>
              <ListCell header className="pe-4 py-2">
                <div className="">{user.name}</div>
                <div className="font-normal text-sm">{user.email}</div>
              </ListCell>
              <ListCell className="ps-4 py-2">
                <RoleSelector
                  label={t("headers.role")}
                  code={params.code}
                  userId={user.id}
                  initialValue={user.roles}
                  options={[
                    {
                      label: t('role', { role: 'ADMIN' }),
                      value: 'ADMIN',
                    },
                    {
                      label: t('role', { role: 'TRANSLATOR' }),
                      value: 'TRANSLATOR',
                    },
                  ]}
                />
              </ListCell>
              <ListCell className="py-2">
                <RemoveUserButton 
                    code={params.code}
                    userId={user.id}
                    label={t("links.remove")}
                />
              </ListCell>
            </ListRow>
          ))}
        </ListBody>
      </List>
    </div>
  );

}
