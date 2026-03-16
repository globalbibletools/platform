import ModalView from "@/components/ModalView";
import { verifyEmail } from "@/modules/users/actions/verifyEmail";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslations } from "next-intl";
import * as z from "zod";

const schema = z.object({ token: z.string().optional() });

export const Route = createFileRoute("/_minimal/verify-email")({
  validateSearch: schema,
  loaderDeps: ({ search }) => ({ token: search.token }),
  loader: ({ deps }) => verifyEmail({ data: { token: deps.token } }),
  component: VerifyEmailRoute,
  notFoundComponent: VerifyEmailNotFoundRoute,
});

function VerifyEmailRoute() {
  const t = useTranslations("EmailVerification");

  return (
    <ModalView className="max-w-[480px] w-full">
      <p className="max-w-[320px] text-center mx-auto">{t("email_verified")}</p>
    </ModalView>
  );
}

function VerifyEmailNotFoundRoute() {
  const t = useTranslations("EmailVerification");

  return (
    <ModalView className="max-w-[480px] w-full">
      <p className="max-w-[320px] text-center mx-auto">
        {t("email_verification_error")}
      </p>
    </ModalView>
  );
}
