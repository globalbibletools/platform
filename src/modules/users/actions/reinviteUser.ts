import * as z from "zod";
import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { serverActionLogger } from "@/server-action";
import mailer from "@/shared/email";
import { NotFoundError } from "@/shared/errors";
import { createPolicyMiddleware, Policy } from "@/modules/access";
import { UserAlreadyActiveError } from "../model/errors";
import userRepository from "../data-access/userRepository";

const requestSchema = z.object({
  userId: z.string().min(1),
});

const policy = new Policy({ systemRoles: [Policy.SystemRole.Admin] });

export const reinviteUserAction = createServerFn({ method: "POST" })
  .inputValidator(requestSchema)
  .middleware([createPolicyMiddleware({ policy })])
  .handler(async ({ data }) => {
    const logger = serverActionLogger("reinviteUserAction");

    try {
      const user = await userRepository.findById(data.userId);
      if (!user) {
        throw new NotFoundError("User");
      }

      const token = user.reinvite();
      await userRepository.commit(user);

      const url = `${process.env.ORIGIN}/invite?token=${token}`;
      await mailer.sendEmail({
        email: user.email.address,
        subject: "GlobalBibleTools Invite",
        text: `You've been invited to globalbibletools.com. Click the following to accept your invite and get started.\n\n${url.toString()}`,
        html: `You've been invited to globalbibletools.com. <a href="${url.toString()}">Click here<a/> to accept your invite and get started.`,
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        logger.error("user not found");
        throw notFound();
      }

      if (error instanceof UserAlreadyActiveError) {
        logger.error("user already active");
        // TODO: convert to error code
        throw new Error("user_exists");
      }

      throw error;
    }
  });
