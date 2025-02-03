"use server";

import * as z from "zod";
import { getTranslations } from "next-intl/server";
import { createSession } from "@/session";
import { redirect } from "next/navigation";
import { FormState } from "@/components/Form";
import homeRedirect from "@/home-redirect";
import { serverActionLogger } from "@/server-action";
import userRepository from "@/modules/users/data-access/UserRepository";

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

  const user = await userRepository.findByEmail(request.data.email);

  if (!user) {
    logger.error("missing user");
    return {
      state: "error",
      error: "Invalid email or password.",
    };
  }

  if (!(await user.auth?.verifyPassword(request.data.password))) {
    logger.error("invalid password");
    return {
      state: "error",
      error: "Invalid email or password.",
    };
  }

  await createSession(user.id);

  redirect(await homeRedirect());
}
