"use server";

import * as z from "zod";
import { getLocale, getTranslations } from "next-intl/server";
import { createSession } from "@/session";
import { redirect } from "next/navigation";
import { FormState } from "@/components/Form";
import { serverActionLogger } from "@/server-action";
import { logIn as logInUseCase } from "../use-cases/logIn";
import { IncorrectPasswordError } from "../model/errors";
import { NotFoundError } from "@/shared/errors";

const loginSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
});

export async function login(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const logger = serverActionLogger("logIn");

  const t = await getTranslations("LoginPage");

  const request = loginSchema.safeParse(
    {
      email: formData.get("email"),
      password: formData.get("password"),
    },
    {
      errorMap: (error) => {
        if (error.path.toString() === "email") {
          return { message: t("errors.email_required") };
        } else if (error.path.toString() === "password") {
          return { message: t("errors.password_required") };
        } else {
          return { message: "Invalid" };
        }
      },
    },
  );
  if (!request.success) {
    logger.error("request parse error");
    return {
      state: "error",
      validation: request.error.flatten().fieldErrors,
    };
  }

  let userId;
  try {
    const result = await logInUseCase(request.data);
    userId = result.userId;
  } catch (error) {
    if (error instanceof IncorrectPasswordError) {
      logger.error("incorrect password");
      return {
        state: "error",
        error: "Invalid email or password.",
      };
    } else if (error instanceof NotFoundError) {
      logger.error("user not found");
      return {
        state: "error",
        error: "Invalid email or password.",
      };
    } else {
      throw error;
    }
  }

  await createSession(userId);
  const locale = await getLocale();
  redirect(`/${locale}/dashboard`);
}
