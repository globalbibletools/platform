"use server";

import * as z from "zod";
import { getTranslations, getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { parseForm } from "@/form-parser";
import { FormState } from "@/components/Form";
import { serverActionLogger } from "@/server-action";
import StartPasswordReset from "../use-cases/StartPasswordReset";
import userRepository from "../data-access/userRepository";

const requestSchema = z.object({
  email: z.string().min(1),
});

const startPasswordResetUseCase = new StartPasswordReset(userRepository);

export async function startPasswordReset(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const logger = serverActionLogger("forgotPassword");

  const t = await getTranslations("ForgotPasswordPage");

  const request = requestSchema.safeParse(parseForm(formData), {
    errorMap: (error) => {
      if (error.path.toString() === "email") {
        return { message: t("errors.email_required") };
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

  await startPasswordResetUseCase.execute(request.data);

  const locale = await getLocale();
  redirect(`/${locale}/login`);
}
