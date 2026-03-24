import * as z from "zod";
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
import { changeUserRoles } from "@/modules/users/actions/changeUserRoles";
import { disableUser } from "@/modules/users/actions/disableUser";
import MultiselectInput from "@/components/MultiselectInput";
import Form from "@/components/Form";
import ServerAction from "@/components/ServerAction";
import { useTranslations } from "next-intl";
import Pagination from "@/components/Pagination";
import { searchUsersReadModel } from "@/modules/users/read-models/searchUsersReadModel";
import { reinviteUserAction } from "@/modules/users/actions/reinviteUser";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

const LIMIT = 20;

const schema = z.object({
  page: z.coerce.number().int().default(1),
});

export const Route = createFileRoute("/_main/admin/_main/users/")({
  validateSearch: schema,
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => {
    return loaderFn({ data: deps });
  },
  component: AdminUsersPage,
});

const loaderFn = createServerFn()
  .inputValidator(schema)
  .handler(async ({ data }) => {
    if (data.page <= 0) {
      throw redirect({ to: "/admin/users", search: { page: 1 } });
    }

    const { page: users, total } = await searchUsersReadModel({
      page: data.page - 1,
      limit: LIMIT,
    });

    if (users.length === 0 && data.page !== 1) {
      throw redirect({ to: "/admin/users", search: { page: 1 } });
    }

    return { users, total };
  });

function AdminUsersPage() {
  const { users, total } = Route.useLoaderData();
  const t = useTranslations("AdminUsersPage");

  return (
    <div className="absolute w-full h-full overflow-auto">
      <div className="px-8 py-6 w-fit">
        <div className="flex items-baseline mb-4">
          <ViewTitle>{t("title")}</ViewTitle>
          <div className="grow" />
          <Button variant="primary" to="/admin/users/invite">
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
                    <div className="block w-fit text-sm px-2 rounded-sm bg-red-700 text-white">
                      <Icon icon="triangle-exclamation" className="me-1" />
                      {t("email_status", {
                        status: user.emailStatus,
                      })}
                    </div>
                  )}
                </ListCell>
                <ListCell className="py-2 ps-2">
                  <Form
                    action={changeUserRoles}
                    invalidate
                    successMessage="User roles updated!"
                  >
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
                        actionData={{ userId: user.id }}
                        action={reinviteUserAction}
                        successMessage="Invite reset!"
                      >
                        {t("links.resend_invite")}
                      </ServerAction>
                      <span className="mx-1">|</span>
                    </>
                  )}
                  <ServerAction
                    variant="tertiary"
                    destructive
                    actionData={{ userId: user.id }}
                    action={disableUser}
                    confirm={t("confirm_disable")}
                    successMessage="User disabled"
                    invalidate
                  >
                    {t("links.disable")}
                  </ServerAction>
                </ListCell>
              </ListRow>
            ))}
          </ListBody>
        </List>
        <Pagination className="mt-6" limit={LIMIT} total={total} />
      </div>
    </div>
  );
}
