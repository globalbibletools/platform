import Button from "@/app/components/Button";
import { Icon } from "@/app/components/Icon";
import { List, ListBody, ListCell, ListHeader, ListHeaderCell, ListRow } from "@/app/components/List";
import ViewTitle from "@/app/components/ViewTitle";
import { query } from "@/app/db";
import { getTranslations } from "next-intl/server";

export default async function AdminUsersPage() {
    const t = await getTranslations("AdminUsersPage")
    const usersQuery = await query<{ id: string, name: string, email: string, emailStatus: string }>(`SELECT id, name, email, "emailStatus" FROM "User" ORDER BY name`, [])
    const users = usersQuery.rows

    return <div className="px-8 py-6 w-fit">
      <div className="flex items-baseline mb-4">
        <ViewTitle>{t('title')}</ViewTitle>
        <div className="flex-grow" />
          <Button
            variant="primary"
            href="./users/invite"
          >
            <Icon icon="plus" className="me-1" />
            {t('links.add_user')}
          </Button>
      </div>
      <List>
        <ListHeader>
          <ListHeaderCell className="min-w-[120px]">
            {t('headers.name')}
          </ListHeaderCell>
          <ListHeaderCell className="min-w-[120px]">
            {t('headers.email')}
          </ListHeaderCell>
          <ListHeaderCell className="min-w-[80px]">
            {t('headers.admin')}
          </ListHeaderCell>
        </ListHeader>
        <ListBody>
          {users.map((user) => (
            <ListRow key={user.id}>
              <ListCell header className="py-2 pe-2">
                {user.name}
              </ListCell>
              <ListCell className="p-2">
                {user.email}
                {user.emailStatus !== 'VERIFIED' && (
                  <div className="block w-fit text-sm px-2 rounded bg-red-700 text-white">
                    <Icon icon="exclamation-triangle" className="me-1" />
                  </div>
                )}
              </ListCell>
              <ListCell className="py-2 ps-2">
              </ListCell>
            </ListRow>
          ))}
        </ListBody>
      </List>
    </div>
}
