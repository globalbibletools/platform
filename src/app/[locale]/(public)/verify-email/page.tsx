import ModalView from "@/components/ModalView";
import { ResolvingMetadata, Metadata } from "next";
import { getTranslations } from "next-intl/server";
import VerifyEmail from "@/modules/users/use-cases/VerifyEmail";
import userRepository from "@/modules/users/data-access/UserRepository";

interface Props {
  searchParams: { token?: string };
}

export async function generateMetadata(
  _: any,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const t = await getTranslations("EmailVerification");
  const { title } = await parent;

  return {
    title: `${t("title")} | ${title?.absolute}`,
  };
}

const verifyEmailUseCase = new VerifyEmail(userRepository);

export default async function EmailVerificationView({ searchParams }: Props) {
  const t = await getTranslations("EmailVerification");

  try {
    await verifyEmailUseCase.execute({ token: searchParams.token ?? "" });
  } catch (error) {
    return (
      <ModalView className="max-w-[480px] w-full">
        <p className="max-w-[320px] text-center mx-auto">
          {t("email_verification_error")}
        </p>
      </ModalView>
    );
  }

  return (
    <ModalView className="max-w-[480px] w-full">
      <p className="max-w-[320px] text-center mx-auto">{t("email_verified")}</p>
    </ModalView>
  );
}
