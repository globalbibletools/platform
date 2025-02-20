"use server";

import * as z from "zod";
import { getTranslations } from "next-intl/server";
import { createSession } from "@/session";
import { notFound, redirect } from "next/navigation";
import { parseForm } from "@/form-parser";
import { FormState } from "@/components/Form";
import homeRedirect from "@/home-redirect";
import { serverActionLogger } from "@/server-action";
import AcceptInvite from "../use-cases/AcceptInvite";
import userRepository from "../data-access/UserRepository";
import { InvalidInvitationTokenError } from "../model/errors";

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

const acceptInviteUseCase = new AcceptInvite(userRepository);

export async function acceptInvite(
  prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const logger = serverActionLogger("acceptInvite");

  const t = await getTranslations("AcceptInvitePage");

  const request = loginSchema.safeParse(parseForm(formData), {
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
      } else if (error.path.toString() === "first_name") {
        return { message: t("errors.first_name_required") };
      } else if (error.path.toString() === "last_name") {
        return { message: t("errors.last_name_required") };
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
    const result = await acceptInviteUseCase.execute({
      token: request.data.token,
      firstName: request.data.first_name,
      lastName: request.data.last_name,
      password: request.data.password,
    });
    userId = result.userId;
  } catch (error) {
    if (error instanceof InvalidInvitationTokenError) {
      notFound();
    } else {
      throw error;
    }
  }

  await createSession(userId);
  redirect(await homeRedirect());
}
