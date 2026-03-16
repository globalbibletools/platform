"use server";

import * as z from "zod";
import { createSession } from "@/session";
import { serverActionLogger } from "@/server-action";
import { logIn as logInUseCase } from "../use-cases/logIn";
import { IncorrectPasswordError } from "../model/errors";
import { NotFoundError } from "@/shared/errors";
import { createServerFn } from "@tanstack/react-start";
import { redirect } from "@tanstack/react-router";
import { parseForm } from "@/form-parser";

const loginSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
});

export const logIn = createServerFn({ method: "POST" })
  .inputValidator((data) => {
    if (!(data instanceof FormData)) {
      throw new Error("expected FormData");
    }

    return loginSchema.parse(parseForm(data));
  })
  .handler(async ({ data }) => {
    const logger = serverActionLogger("logIn");

    let userId;
    try {
      const result = await logInUseCase(data);
      userId = result.userId;
    } catch (error) {
      if (error instanceof IncorrectPasswordError) {
        logger.error("incorrect password");
        throw new Error("Invalid email or password.");
      } else if (error instanceof NotFoundError) {
        logger.error("user not found");
        throw new Error("Invalid email or password.");
      } else {
        throw error;
      }
    }

    await createSession(userId);
    throw redirect({ to: `/` });
  });
