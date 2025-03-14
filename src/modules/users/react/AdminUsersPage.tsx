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
import { getMessages, getTranslations } from "next-intl/server";
import { Metadata, ResolvingMetadata } from "next";
import { changeUserRoles } from "@/modules/users/actions/changeUserRoles";
import { disableUser } from "@/modules/users/actions/disableUser";
import MultiselectInput from "@/components/MultiselectInput";
import Form from "@/components/Form";
import ServerAction from "@/components/ServerAction";
import { redirect } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import Pagination from "@/components/Pagination";
import { inviteUser } from "@/modules/users/actions/inviteUser";
import userQueryService from "@/modules/users/data-access/UserQueryService";

export async function generateMetadata(
  _: any,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const t = await getTranslations("AdminUsersPage");
  const { title } = await parent;

  return {
    title: `${t("title")} | ${title?.absolute}`,
  };
}

interface AdminUsersPage {
  searchParams: { page?: string };
}

const LIMIT = 20;

export default async function AdminUsersPage({ searchParams }: AdminUsersPage) {
  const t = await getTranslations("AdminUsersPage");
  const messages = await getMessages();

  let page = parseInt(searchParams.page ?? "");
  if (page <= 0 || isNaN(page) || page.toString() !== searchParams.page) {
    redirect("./users?page=1");
  }

  const { page: users, total } = await userQueryService.search({
    page: page - 1,
    limit: LIMIT,
  });
  if (users.length === 0 && page !== 1) {
    redirect("./users?page=1");
  }

  return (
    <div className="absolute w-full h-full overflow-auto">
      <div className="px-8 py-6 w-fit">
        <div className="flex items-baseline mb-4">
          <ViewTitle>{t("title")}</ViewTitle>
          <div className="flex-grow" />
          <Button variant="primary" href="./users/invite">
            <Icon icon="plus" className="me-1" />
            {t("links.add_user")}
          </Button>
        </div>
        <List>
          <ListHeader>
            <ListHeaderCell className="min-w-[120px]">
              {t("headers.name")}
            </ListHeaderCell>
            <ListHeaderCell className="min-w-[120px]">
              {t("headers.email")}
            </ListHeaderCell>
            <ListHeaderCell className="min-w-[80px]">
              {t("headers.role")}
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
                  {user.emailStatus !== "VERIFIED" && (
                    <div className="block w-fit text-sm px-2 rounded bg-red-700 text-white">
                      <Icon icon="exclamation-triangle" className="me-1" />
                      {t("email_status", {
                        status: user.emailStatus,
                      })}
                    </div>
                  )}
                </ListCell>
                <ListCell className="py-2 ps-2">
                  <Form action={changeUserRoles}>
                    <input type="hidden" name="userId" value={user.id} />
                    <MultiselectInput
                      className="w-28"
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
                      ]}
                    />
                  </Form>
                </ListCell>
                <ListCell className="ps-4">
                  {user.invite !== null && (
                    <>
                      <ServerAction
                        variant="tertiary"
                        actionData={{ email: user.email }}
                        action={inviteUser}
                      >
                        {t("links.resend_invite")}
                      </ServerAction>
                      <span className="mx-1">|</span>
                    </>
                  )}
                  <Button variant="link" href={`./users/${user.id}/reports`}>
                    {t("links.reports")}
                  </Button>
                  <span className="mx-1">|</span>
                  <ServerAction
                    variant="tertiary"
                    destructive
                    actionData={{ userId: user.id }}
                    action={disableUser}
                    confirm={t("confirm_disable")}
                  >
                    {t("links.disable")}
                  </ServerAction>
                </ListCell>
              </ListRow>
            ))}
          </ListBody>
        </List>
        <NextIntlClientProvider messages={{ Pagination: messages.Pagination }}>
          <Pagination className="mt-6" limit={LIMIT} total={total} />
        </NextIntlClientProvider>
      </div>
    </div>
  );
}
