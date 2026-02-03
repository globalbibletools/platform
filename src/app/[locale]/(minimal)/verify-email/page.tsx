import ModalView from "@/components/ModalView";
import { ResolvingMetadata, Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { verifyEmail } from "@/modules/users/use-cases/verifyEmail";

interface Props {
  searchParams: Promise<{ token?: string }>;
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

export default async function EmailVerificationView(props: Props) {
  const searchParams = await props.searchParams;
  const t = await getTranslations("EmailVerification");

  try {
    await verifyEmail({ token: searchParams.token ?? "" });
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
