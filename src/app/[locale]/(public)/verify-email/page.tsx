import LoadingSpinner from "@/app/components/LoadingSpinner";
import ModalView from "@/app/components/ModalView";
import mailer from "@/app/mailer";
import { query, transaction } from "@/app/db";
import { ResolvingMetadata, Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

interface Props {
  searchParams: { token?: string };
}

export async function generateMetadata(
  _: any,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const t = await getTranslations("EmailVerification");
  const { title } = await parent;

  return {
    title: `${t("title")} | ${title?.absolute}`,
  };
}

export default async function EmailVerificationView({ searchParams }: Props) {
  const t = await getTranslations("EmailVerification");

  if (!searchParams.token) {
    notFound();
  }

  const verificationQuery = await query<{
    userId: string;
    email: string;
    expires: number;
  }>(
    `SELECT user_id, email, expires FROM user_email_verification WHERE token = $1`,
    [searchParams.token]
  );
  const verification = verificationQuery.rows[0];

  if (!verification || verification.expires < Date.now()) {
    notFound();
  }

  try {
    await transaction(async (q) => {
      await q(
        `UPDATE users SET 
                email = $1, 
                email_status = 'VERIFIED' 
            WHERE users.id = $2
            `,
        [verification.email, verification.userId]
      );
      await q(`DELETE FROM user_email_verification WHERE token = $1`, [
        searchParams.token,
      ]);
    });
    await mailer.sendEmail({
      email: verification.email,
      subject: "Email Changed",
      text: `Your email address for Global Bible Tools was changed to ${verification.email}.`,
      html: `Your email address for Global Bible Tools was changed to <strong>${verification.email}</strong>.`,
    });

    return (
      <ModalView className="max-w-[480px] w-full">
        <p className="max-w-[320px] text-center mx-auto">
          {t("email_verified")}
        </p>
      </ModalView>
    );
  } catch (e) {
    return (
      <ModalView className="max-w-[480px] w-full">
        <p className="max-w-[320px] text-center mx-auto">
          {t("email_verification_error")}
        </p>
      </ModalView>
    );
  }
}
