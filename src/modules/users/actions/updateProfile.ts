import * as z from "zod";
import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { parseForm } from "@/form-parser";
import { serverActionLogger } from "@/server-action";
import { updateProfile as updateProfileUseCase } from "../use-cases/updateProfile";
import { createPolicyMiddleware, Policy } from "@/modules/access";
import { NotFoundError } from "@/shared/errors";

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

const policy = new Policy({ authenticated: true });

export const updateProfile = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    if (!(data instanceof FormData)) {
      throw new Error("expected FormData");
    }

    return profileValidationSchema.parse(parseForm(data));
  })
  .middleware([createPolicyMiddleware({ policy })])
  .handler(async ({ data, context }) => {
    const logger = serverActionLogger("updateProfile");

    try {
      await updateProfileUseCase({
        id: context.session.user.id,
        ...data,
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw notFound();
      }

      throw error;
    }

    // TODO: refresh page
  });
