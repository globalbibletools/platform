import Button from "@/components/Button";
import { Icon } from "@/components/Icon";
import {
  List,
  ListBody,
  ListCell,
  ListHeader,
  ListHeaderCell,
  ListRow,
} from "@/components/List";
import ViewTitle from "@/components/ViewTitle";
import { query } from "@/db";
import { getTranslations } from "next-intl/server";
import { Metadata, ResolvingMetadata } from "next";
import MultiselectInput from "@/components/MultiselectInput";
import Form from "@/components/Form";
import { changeLanguageMemberRoles } from "@/modules/languages/actions/changeLanguageMemberRoles";
import { removeLanguageMember } from "@/modules/languages/actions/removeLanguageMember";
import ServerAction from "@/components/ServerAction";
import { inviteUser } from "@/modules/users/actions/inviteUser";
import { verifySession } from "@/session";
import Policy from "@/modules/access/public/Policy";
import { notFound } from "next/navigation";

interface LanguageUsersPageProps {
  params: { code: string };
}

export async function generateMetadata(
  _: any,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const t = await getTranslations("LanguageUsersPage");
  const { title } = await parent;

  return {
    title: `${t("title")} | ${title?.absolute}`,
  };
}

const policy = new Policy({ systemRoles: [Policy.SystemRole.Admin] });

export default async function LanguageUsersPage({
  params,
}: LanguageUsersPageProps) {
  const t = await getTranslations("LanguageUsersPage");

  const session = await verifySession();
  const isAuthorized = await policy.authorize({
    actorId: session?.user.id,
    languageCode: params.code,
  });
  if (!isAuthorized) {
    notFound();
  }

  const users = await fetchUsers(params.code);

  return (
    <div className="absolute w-full h-full overflow-auto">
      <div className="px-8 py-6 w-fit">
        <div className="flex items-baseline mb-4">
          <ViewTitle>{t("title")}</ViewTitle>
          <div className="flex-grow" />
          <Button href="./users/invite" variant="primary">
            <Icon icon="plus" className="me-1" />
            {t("links.invite_user")}
          </Button>
        </div>
        <List>
          <ListHeader>
            <ListHeaderCell className="min-w-[120px]">
              {t("headers.name")}
            </ListHeaderCell>
            <ListHeaderCell className="min-w-[80px] ps-4">
              {t("headers.role")}
            </ListHeaderCell>
            <ListHeaderCell />
          </ListHeader>
          <ListBody>
            {users.map((user) => (
              <ListRow key={user.id}>
                <ListCell header className="pe-4 py-2">
                  <div className="">{user.name}</div>
                  <div className="font-normal text-sm">{user.email}</div>
                </ListCell>
                <ListCell className="ps-4 py-2">
                  <Form action={changeLanguageMemberRoles}>
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
                          label: t("role", {
                            role: "ADMIN",
                          }),
                          value: "ADMIN",
                        },
                        {
                          label: t("role", {
                            role: "TRANSLATOR",
                          }),
                          value: "TRANSLATOR",
                        },
                      ]}
                    />
                  </Form>
                </ListCell>
                <ListCell className="py-2">
                  {user.invite && (
                    <ServerAction
                      variant="tertiary"
                      className="ms-4"
                      actionData={{ email: user.email }}
                      action={inviteUser}
                    >
                      {t("links.resend_invite")}
                    </ServerAction>
                  )}
                  <ServerAction
                    variant="tertiary"
                    className="text-red-700 ms-2 -me-2"
                    destructive
                    actionData={{
                      userId: user.id,
                      code: params.code,
                    }}
                    action={removeLanguageMember}
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
    </div>
  );
}

interface User {
  id: string;
  name: string;
  email: string;
  roles: string[];
  invite: null | {
    token: string;
    expires: number;
  };
}

async function fetchUsers(code: string) {
  const usersQuery = await query<User>(
    `SELECT
            u.id, u.name, u.email,
            m.roles AS roles,
            invitation.json AS invite
        FROM (
            SELECT 
                r.user_id AS id,
                COALESCE(json_agg(r.role) FILTER (WHERE r.role IS NOT NULL AND r.role != 'VIEWER'), '[]') AS roles
            FROM language_member_role AS r
            WHERE r.language_id = (SELECT id FROM language WHERE code = $1)
            GROUP BY r.user_id
        ) AS m
        JOIN users AS u ON m.id = u.id
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
        WHERE u.status <> 'disabled'
        ORDER BY u.name`,
    [code],
  );
  return usersQuery.rows;
}
