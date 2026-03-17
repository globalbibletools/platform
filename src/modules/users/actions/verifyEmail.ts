import * as z from "zod";
import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { verifyEmail as verifyEmailUseCase } from "../use-cases/verifyEmail";
import { InvalidEmailVerificationToken } from "../model/errors";
import { createPolicyMiddleware, Policy } from "@/modules/access";

const requestSchema = z.object({
  token: z.string().min(1),
});

export const verifyEmail = createServerFn({ method: "POST" })
  .inputValidator(requestSchema)
  .middleware([
    createPolicyMiddleware({
      policy: new Policy({ authenticated: false }),
    }),
  ])
  .handler(async ({ data }) => {
    try {
      await verifyEmailUseCase(data);
    } catch (error) {
      if (error instanceof InvalidEmailVerificationToken) {
        throw notFound();
      }

      throw error;
    }
  });
