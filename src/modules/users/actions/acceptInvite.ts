import * as z from "zod";
import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { createSession } from "@/session";
import { parseForm } from "@/form-parser";
import { acceptInvite as acceptInviteUseCase } from "../use-cases/acceptInvite";
import { InvalidInvitationTokenError } from "../model/errors";
import { createPolicyMiddleware, Policy } from "@/modules/access";

const loginSchema = z
  .object({
    token: z.string(),
    first_name: z.string().min(1),
    last_name: z.string().min(1),
    password: z.string().min(8),
    confirm_password: z.string().min(1),
  })
  .refine((data) => data.password === data.confirm_password, {
    path: ["confirm_password"],
  });

export const acceptInvite = createServerFn({ method: "POST" })
  .inputValidator((data) => {
    if (!(data instanceof FormData)) {
      throw new Error("expected FormData");
    }

    return loginSchema.parse(parseForm(data));
  })
  .middleware([
    createPolicyMiddleware({
      policy: new Policy({ authenticated: false }),
    }),
  ])
  .handler(async ({ data }) => {
    let userId;
    try {
      const result = await acceptInviteUseCase({
        token: data.token,
        firstName: data.first_name,
        lastName: data.last_name,
        password: data.password,
      });
      userId = result.userId;
    } catch (error) {
      if (error instanceof InvalidInvitationTokenError) {
        throw notFound();
      } else {
        throw error;
      }
    }

    await createSession(userId);
  });
