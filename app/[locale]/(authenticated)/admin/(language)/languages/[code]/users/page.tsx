import Button from "@/app/components/Button";
import { Icon } from "@/app/components/Icon";
import { List, ListBody, ListCell, ListHeader, ListHeaderCell, ListRow } from "@/app/components/List";
import ViewTitle from "@/app/components/ViewTitle";
import { query } from "@/shared/db";
import { getTranslations } from "next-intl/server";
import { Metadata, ResolvingMetadata } from "next";
import MultiselectInput from "@/app/components/MultiselectInput";
import Form from "@/app/components/Form";
import { changeUserLanguageRole, removeLanguageUser } from "./actions";
import ServerAction from "@/app/components/ServerAction";

interface LanguageUsersPageProps {
    params: { code: string }
}

export async function generateMetadata(_: any, parent: ResolvingMetadata): Promise<Metadata> {
    const t = await getTranslations("LanguageUsersPage")
    const { title } = await parent

    return {
        title: `${t("title")} | ${title?.absolute}`
    }
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
                                <Form action={changeUserLanguageRole}>
                                    <input type="hidden" name="code" value={params.code} />
                                    <input type="hidden" name="userId" value={user.id} />
                                    <MultiselectInput
                                        className="w-48"
                                        name="roles"
                                        autosubmit
                                        defaultValue={user.roles}
                                        aria-label={t("headers.role")}
                                        items={[
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
                                </Form>
                            </ListCell>
                            <ListCell className="py-2">
                                <ServerAction
                                    variant="tertiary"
                                    className="text-red-700 ms-2 -me-2"
                                    destructive
                                    actionData={{ userId: user.id, code: params.code }}
                                    action={removeLanguageUser}
                                >
                                    <Icon icon="xmark" />
                                    <span className="sr-only">{t("links.remove")}</span>
                                </ServerAction>
                            </ListCell>
                        </ListRow>
                    ))}
                </ListBody>
            </List>
        </div>
    );

}
