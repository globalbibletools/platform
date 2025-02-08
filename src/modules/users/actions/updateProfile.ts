"use server";

import * as z from "zod";
import { getLocale, getTranslations } from "next-intl/server";
import { FormState } from "@/components/Form";
import { revalidatePath } from "next/cache";
import { parseForm } from "@/form-parser";
import { serverActionLogger } from "@/server-action";
import { verifySession } from "@/session";
import { notFound } from "next/navigation";
import UpdateProfile from "../use-cases/UpdateProfile";
import userRepository from "../data-access/UserRepository";

const profileValidationSchema = z
  .object({
    email: z.string().email().min(1),
    name: z.string().min(1),
    password: z.union([z.string().min(8), z.literal("")]).optional(),
    confirm_password: z.string().optional(),
  })
  .refine((data) => data.password === data.confirm_password, {
    path: ["confirm_password"],
  });

const updateProfileUseCase = new UpdateProfile(userRepository);

export async function updateProfile(
  _prevState: FormState,
  data: FormData,
): Promise<FormState> {
  const logger = serverActionLogger("updateProfile");

  const t = await getTranslations("ProfileView");
  const request = profileValidationSchema.safeParse(parseForm(data), {
    errorMap: (error) => {
      switch (error.path[0]) {
        case "email":
          if (error.code === "invalid_string") {
            return { message: t("errors.email_format") };
          } else {
            return { message: t("errors.email_required") };
          }
        case "name":
          return { message: t("errors.name_required") };
        case "password":
          return { message: t("errors.password_format") };
        case "confirm_password":
          return { message: t("errors.password_confirmation") };
        default:
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

  const session = await verifySession();
  if (!session) notFound();

  await updateProfileUseCase.execute({
    id: session.user.id,
    ...request.data,
  });

  revalidatePath(`/${await getLocale()}/profile`);
  return { state: "success", message: t("profile_updated") };
}
