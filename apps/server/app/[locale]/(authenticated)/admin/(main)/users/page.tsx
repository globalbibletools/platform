import Button from "@/app/components/Button";
import { Icon } from "@/app/components/Icon";
import { List, ListBody, ListCell, ListHeader, ListHeaderCell, ListRow } from "@/app/components/List";
import ViewTitle from "@/app/components/ViewTitle";
import { query } from "@gbt/db/query";
import { getTranslations } from "next-intl/server";
import { Metadata, ResolvingMetadata } from "next";
import { changeUserRole, resendUserInvite } from "./actions";
import MultiselectInput from "@/app/components/MultiselectInput";
import Form from "@/app/components/Form";
import ServerAction from "@/app/components/ServerAction";

export async function generateMetadata(_: any, parent: ResolvingMetadata): Promise<Metadata> {
    const t = await getTranslations("AdminUsersPage")
    const { title } = await parent

    return {
        title: `${t("title")} | ${title?.absolute}`
    }
}

export default async function AdminUsersPage() {
    const t = await getTranslations("AdminUsersPage")

    const users = await fetchUsers()

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
                <ListHeaderCell />
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
                        <ListCell className="ps-4">
                            {user.invite !== null &&
                                <ServerAction
                                    variant="tertiary"
                                    className="ms-4"
                                    actionData={{ userId: user.id }}
                                    action={resendUserInvite}
                                >
                                    {t("links.resend_invite")}
                                </ServerAction>
                            }
                        </ListCell>
                    </ListRow>
                ))}
            </ListBody>
        </List>
    </div>
}

interface User {
    id: string,
    name: string,
    email: string,
    emailStatus: string,
    roles: string[]
    invite: null | {
        token: string
        expires: number
    }
}

async function fetchUsers() {
    const usersQuery = await query<User>(
        `SELECT
            id, name, email, email_status AS "emailStatus",
            roles.list AS roles,
            invitation.json AS invite
        FROM users AS u
        JOIN LATERAL (
            SELECT
                COALESCE(json_agg(r.role), '[]') AS list
            FROM user_system_role AS r
            WHERE r.user_id = u.id
        ) AS roles ON true
        LEFT JOIN LATERAL (
            SELECT
				JSON_BUILD_OBJECT(
				  'token', i.token,
				  'expires', i.expires
				) as json
            FROM user_invitation AS i
            WHERE i.user_id = u.id
            ORDER BY i.expires DESC
            LIMIT 1
        ) AS invitation ON true
        ORDER BY u.name`,
        []
    )
    return usersQuery.rows
}
