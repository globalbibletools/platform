import Button from "@/app/components/Button";
import { Icon } from "@/app/components/Icon";
import { List, ListBody, ListCell, ListHeader, ListHeaderCell, ListRow } from "@/app/components/List";
import ViewTitle from "@/app/components/ViewTitle";
import { query } from "@/app/db";
import { getTranslations } from "next-intl/server";
import { Metadata, ResolvingMetadata } from "next";
import { changeUserRole } from "./actions";
import MultiselectInput from "@/app/components/MultiselectInput";
import Form from "@/app/components/Form";

export async function generateMetadata(_: any, parent: ResolvingMetadata): Promise<Metadata> {
    const t = await getTranslations("AdminUsersPage")
    const { title } = await parent

    return {
        title: `${t("title")} | ${title?.absolute}`
    }
}

export default async function AdminUsersPage() {
    const t = await getTranslations("AdminUsersPage")
    const usersQuery = await query<{ id: string, name: string, email: string, emailStatus: string, roles: [] }>(
        `SELECT
            id, name, email, "emailStatus",
            COALESCE(json_agg(r.role) FILTER (WHERE r.role IS NOT NULL), '[]') AS roles
        FROM "User" AS u
        LEFT JOIN "UserSystemRole" AS r ON r."userId" = u.id
        GROUP BY u.id
        ORDER BY u.name`,
        []
    )
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
                    {t('headers.role')}
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
                                    {t("email_status", { status: user.emailStatus })}
                                </div>
                            )}
                        </ListCell>
                        <ListCell className="py-2 ps-2">
                            <Form action={changeUserRole}>
                                <input type="hidden" name="userId" value={user.id} />
                                <MultiselectInput
                                    className="w-28"
                                    name="roles"
                                    autosubmit
                                    defaultValue={user.roles}
                                    aria-label={t("headers.role")}
                                    items={[
                                        { label: t("role", { role: "ADMIN" }), value: "ADMIN" }
                                    ]}
                                />
                            </Form>
                        </ListCell>
                    </ListRow>
                ))}
            </ListBody>
        </List>
    </div>
}
