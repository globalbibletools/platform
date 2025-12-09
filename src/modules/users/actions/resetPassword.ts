"use server";

import * as z from "zod";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { parseForm } from "@/form-parser";
import { createSession } from "@/session";
import { FormState } from "@/components/Form";
import { serverActionLogger } from "@/server-action";
import ResetPassword from "../use-cases/ResetPassword";
import userRepository from "../data-access/userRepository";
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

const resetPasswordUseCase = new ResetPassword(userRepository);

export async function resetPassword(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const logger = serverActionLogger("resetPassword");

  const t = await getTranslations("ResetPasswordPage");

  const request = requestSchema.safeParse(parseForm(formData), {
    errorMap: (error) => {
      if (error.path.toString() === "password") {
        if (error.code === "too_small") {
          return { message: t("errors.password_format") };
        } else {
          return { message: t("errors.password_required") };
        }
      } else if (error.path.toString() === "confirm_password") {
        if (error.code === "custom") {
          return { message: t("errors.confirm_password_mismatch") };
        } else {
          return { message: t("errors.confirm_password_required") };
        }
      } else {
        return { message: "Invalid" };
      }
    },
  });
  if (!request.success) {
    logger.error("request parse error");
    return {
      state: "error",
      validation: request.error.flatten().fieldErrors,
    };
  }

  let userId;
  try {
    const response = await resetPasswordUseCase.execute(request.data);
    userId = response.userId;
  } catch (error) {
    if (error instanceof NotFoundError) {
      logger.error("user not found");
      notFound();
    } else {
      throw error;
    }
  }

  await createSession(userId);
  const locale = await getLocale();
  redirect(`/${locale}/dashboard`);
}
