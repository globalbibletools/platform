"use server";

import * as z from "zod";
import { createServerFn } from "@tanstack/react-start";
import { redirect, notFound } from "@tanstack/react-router";
import { parseForm } from "@/form-parser";
import { createSession } from "@/session";
import { serverActionLogger } from "@/server-action";
import { resetPassword as resetPasswordUseCase } from "../use-cases/resetPassword";
import { NotFoundError } from "@/shared/errors";

const requestSchema = z
  .object({
    token: z.string(),
    password: z.string().min(1),
    confirm_password: z.string().min(1),
  })
  .refine((data) => data.password === data.confirm_password, {
    path: ["confirm_password"],
  });

export const resetPassword = createServerFn({ method: "POST" })
  .inputValidator((data) => {
    if (!(data instanceof FormData)) {
      throw new Error("expected FormData");
    }

    return requestSchema.parse(parseForm(data));
  })
  .handler(async ({ data }) => {
    const logger = serverActionLogger("resetPassword");

    let userId;
    try {
      const response = await resetPasswordUseCase(data);
      userId = response.userId;
    } catch (error) {
      if (error instanceof NotFoundError) {
        logger.error("user not found");
        throw notFound();
      } else {
        throw error;
      }
    }

    await createSession(userId);
    throw redirect({ to: "/dashboard" });
  });
