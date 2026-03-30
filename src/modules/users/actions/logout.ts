import { clearSession } from "@/session";
import { createServerFn } from "@tanstack/react-start";
import { createPolicyMiddleware, Policy } from "@/modules/access";

const policy = new Policy({ authenticated: true });

export const logout = createServerFn()
  .middleware([createPolicyMiddleware({ policy })])
  .handler(async () => {
    await clearSession();
  });
