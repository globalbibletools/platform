import Button from "@/components/Button";
import ComboboxInput from "@/components/ComboboxInput";
import FieldError from "@/components/FieldError";
import Form from "@/components/Form";
import FormLabel from "@/components/FormLabel";
import ViewTitle from "@/components/ViewTitle";
import { Metadata, ResolvingMetadata } from "next";
import { getTranslations } from "next-intl/server";
import { importLanguage } from "../actions/importLanguage";
import { resetImport } from "../actions/resetImport";
import { query } from "@/db";
import LoadingSpinner from "@/components/LoadingSpinner";
import Poller from "./Poller";
import { Policy } from "@/modules/access";
import { verifySession } from "@/session";
import { notFound } from "next/navigation";

const IMPORT_SERVER = "https://hebrewgreekbible.online";

interface LanguageImportPageProps {
  params: { code: string };
}

export async function generateMetadata(
  _: any,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const t = await getTranslations("LanguageImportPage");
  const { title } = await parent;

  return {
    title: `${t("title")} | ${title?.absolute}`,
  };
}

const policy = new Policy({ systemRoles: [Policy.SystemRole.Admin] });

export default async function LanguageImportPage({
  params,
}: LanguageImportPageProps) {
  const t = await getTranslations("LanguageImportPage");

  const session = await verifySession();
  const isAuthorized = await policy.authorize({
    actorId: session?.user.id,
    languageCode: params.code,
  });
  if (!isAuthorized) {
    notFound();
  }

  const job = await fetchImportJob(params.code);

  if (!job) {
    const languages = await fetchImportLanguages();

    return (
      <div className="px-8 py-6 w-fit">
        <ViewTitle>{t("title")}</ViewTitle>
        <Form className="max-w-[300px] w-full" action={importLanguage}>
          <input type="hidden" name="code" value={params.code} />
          <div className="mb-4">
            <FormLabel htmlFor="language">{t("form.language")}</FormLabel>
            <ComboboxInput
              items={languages.map((l) => ({
                value: l,
                label: l,
              }))}
              id="language"
              name="language"
              className="w-full"
              aria-describedby="language-error"
            />
            <FieldError id="language-error" name="language" />
          </div>
          <Button destructive type="submit" className="mb-2">
            {t("form.submit")}
          </Button>
        </Form>
      </div>
    );
  } else if (job.succeeded === true) {
    return (
      <div className="px-8 py-6 w-fit">
        <ViewTitle>{t("title")}</ViewTitle>
        <p className="mb-4">{t("status.success")}</p>
        <form action={resetImport}>
          <input type="hidden" name="code" value={params.code} />
          <Button type="submit">{t("actions.reset")}</Button>
        </form>
      </div>
    );
  } else if (job.succeeded === false) {
    return (
      <div className="px-8 py-6 w-fit">
        <ViewTitle>{t("title")}</ViewTitle>
        <p className="mb-4">{t("status.fail")}</p>
        <form action={resetImport}>
          <input type="hidden" name="code" value={params.code} />
          <Button type="submit">{t("actions.reset")}</Button>
        </form>
      </div>
    );
  } else {
    return (
      <div className="px-8 py-6 w-fit">
        <ViewTitle>{t("title")}</ViewTitle>
        <p className="mb-4">{t("status.running")}</p>
        <div className="flex justify-center">
          <LoadingSpinner />
        </div>
        <Poller code={params.code} />
      </div>
    );
  }
}

async function fetchImportLanguages() {
  const response = await fetch(IMPORT_SERVER);
  const html = await response.text();

  const regex = /var glossLanguageNames\s*=\s*\[([\s\S]*?)\];/;
  const matches = html.match(regex);
  if (!matches?.[1]) return [];

  const languageNames = matches[1]
    .split(",")
    .map((name: string) => name.trim().replace(/['"]+/g, ""))
    .filter((name: string) => name.length > 0);
  return languageNames;
}

interface LanguageImportJob {
  startDate: Date;
  endDate: Date;
  succeeded?: boolean;
}

async function fetchImportJob(
  code: string,
): Promise<LanguageImportJob | undefined> {
  const jobQuery = await query<LanguageImportJob>(
    `
        SELECT start_date AS "startDate", end_date AS "endDate", succeeded FROM language_import_job AS j
        JOIN language AS l ON l.id = j.language_id
        WHERE l.code = $1
        `,
    [code],
  );
  return jobQuery.rows[0];
}
