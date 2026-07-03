import * as z from "zod";
import { createServerFn } from "@tanstack/react-start";
import { parseForm } from "@/form-parser";
import mailer from "@/shared/email";
import { addUserToLanguages } from "@/modules/languages";
import { createPolicyMiddleware, Policy } from "@/modules/access";
import userRepository from "../data-access/userRepository";
import User from "../model/User";

const requestSchema = z.object({
  email: z.string().email().min(1),
  languages: z.array(z.string()).optional(),
});

const policy = new Policy({ systemRoles: [Policy.SystemRole.Admin] });

export const inviteUser = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    if (!(data instanceof FormData)) {
      throw new Error("expected FormData");
    }

    return requestSchema.parse(parseForm(data));
  })
  .middleware([createPolicyMiddleware({ policy })])
  .handler(async ({ data }) => {
    let token;
    let user = await userRepository.findByEmail(data.email);
    if (!user) {
      const result = User.invite(data.email);
      user = result.user;
      token = result.token;
    } else if (!user.isActive()) {
      token = user.reinvite();
    }

    if (token) {
      await userRepository.commit(user);

      const url = `${process.env.ORIGIN}/invite?token=${token}`;
      await mailer.sendEmail({
        email: user.email.address,
        subject: "GlobalBibleTools Invite",
        text: `You've been invited to globalbibletools.com. Click the following to accept your invite and get started.\n\n${url.toString()}`,
        html: `You've been invited to globalbibletools.com. <a href="${url.toString()}">Click here<a/> to accept your invite and get started.`,
      });
    }

    if (data.languages && data.languages.length > 0) {
      await addUserToLanguages({ userId: user.id, languages: data.languages });
    }
  });
