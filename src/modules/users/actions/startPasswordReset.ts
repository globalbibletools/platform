"use server";

import * as z from "zod";
import { createServerFn } from "@tanstack/react-start";
import { parseForm } from "@/form-parser";
import { serverActionLogger } from "@/server-action";
import { startPasswordReset as startPasswordResetUseCase } from "../use-cases/startPasswordReset";
import { createPolicyMiddleware, Policy } from "@/modules/access";

const requestSchema = z.object({
  email: z.string().min(1),
});

export const startPasswordReset = createServerFn({ method: "POST" })
  .inputValidator((data) => {
    if (!(data instanceof FormData)) {
      throw new Error("expected FormData");
    }

    return requestSchema.parse(parseForm(data));
  })
  .middleware([
    createPolicyMiddleware({
      policy: new Policy({ authenticated: false }),
    }),
  ])
  .handler(async ({ data }) => {
    const logger = serverActionLogger("forgotPassword");

    try {
      await startPasswordResetUseCase(data);
    } catch (error) {
      logger.error("password reset request failed", error);
      throw error;
    }
  });
