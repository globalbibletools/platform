import * as z from "zod";
import { notFound } from "next/navigation";
import { parseForm } from "@/form-parser";
import { verifySession } from "@/session";
import { FormState } from "@/components/Form";
import { serverActionLogger } from "@/server-action";
import { NotFoundError } from "@/shared/errors";
import { Policy } from "@/modules/access";
import { reinviteLanguageMember } from "../use-cases/reinviteLanguageMember";

const requestSchema = z.object({
  code: z.string(),
  userId: z.string(),
});

const policy = new Policy({
  systemRoles: [Policy.SystemRole.Admin],
});

export async function reinviteLanguageMemberAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const logger = serverActionLogger("inviteUser");

  const request = requestSchema.safeParse(parseForm(formData));
  if (!request.success) {
    logger.error("request parse error");
    return {
      state: "error",
    };
  }

  const session = await verifySession();
  const authorized = await policy.authorize({
    actorId: session?.user.id,
    languageCode: request.data.code,
  });
  if (!authorized) {
    logger.error("unauthorized");
    notFound();
  }

  try {
    await reinviteLanguageMember(request.data);
  } catch (error) {
    if (error instanceof NotFoundError) {
      logger.error("language not found");
      notFound();
    } else {
      throw error;
    }
  }

  return { state: "success" };
}
