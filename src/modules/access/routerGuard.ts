import { notFound, redirect } from "@tanstack/react-router";
import { SystemRoleRaw } from "@/modules/users/index";
import Policy from "./Policy";

export interface AuthContext {
  user?: { id: string; name: string };
  systemRoles: SystemRoleRaw[];
  languages: { id: string; englishName: string; code: string }[];
}

export function routerGuard({
  context,
  policy,
}: {
  context: AuthContext;
  policy: Policy;
}) {
  const actor =
    context.user ?
      {
        id: context.user.id,
        systemRoles: context.systemRoles,
      }
    : undefined;

  const authorized = policy.authorize({
    actor,
  });
  if (authorized) return;

  if (policy.options.authenticated === false) {
    throw redirect({ to: "/dashboard" });
  } else if (!actor) {
    throw redirect({ to: "/login" });
  } else {
    throw notFound();
  }
}
