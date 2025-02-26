"use server";

import * as z from "zod";
import { getTranslations, getLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { verifySession } from "@/session";
import { FormState } from "@/components/Form";
import { serverActionLogger } from "@/server-action";
import InviteUser from "../use-cases/InviteUser";
import userRepository from "../data-access/UserRepository";
import { UserAlreadyActiveError } from "../model/errors";
import Policy from "@/modules/access/public/Policy";

const requestSchema = z.object({
  email: z.string().email().min(1),
});

const policy = new Policy({
  systemRoles: [Policy.SystemRole.Admin],
});

const inviteUserUseCase = new InviteUser(userRepository);

export async function inviteUser(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const logger = serverActionLogger("inviteUser");

  const t = await getTranslations("InviteUserPage");

  const request = requestSchema.safeParse(
    {
      email: formData.get("email"),
    },
    {
      errorMap: (error) => {
        if (error.path.toString() === "email") {
          if (error.code === "invalid_string") {
            return { message: t("errors.email_format") };
          } else {
            return { message: t("errors.email_required") };
          }
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

  const session = await verifySession();
  const authorized = await policy.authorize({
    actorId: session?.user.id,
  });
  if (!authorized) {
    logger.error("unauthorized");
    notFound();
  }

  try {
    await inviteUserUseCase.execute({ email: request.data.email });
  } catch (error) {
    if (error instanceof UserAlreadyActiveError) {
      logger.error("user already exists");
      return {
        state: "error",
        error: t("errors.user_exists"),
      };
    } else {
      throw error;
    }
  }

  const locale = await getLocale();
  redirect(`/${locale}/admin/users`);
}
