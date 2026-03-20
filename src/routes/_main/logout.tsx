import { createFileRoute, redirect } from "@tanstack/react-router";
import { logout } from "@/modules/users/actions/logout";
import { Policy } from "@/modules/access";
import { routerGuard } from "@/modules/access/routerGuard";

const policy = new Policy({ authenticated: true });

export const Route = createFileRoute("/_main/logout")({
  beforeLoad: ({ context }) => {
    routerGuard({ context: context.auth, policy });
  },
  loader: async () => {
    await logout();
    throw redirect({ to: "/login" });
  },
});
