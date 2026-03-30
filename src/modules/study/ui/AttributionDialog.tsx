import Button from "@/components/Button";
import { Icon } from "@/components/Icon";
import { useRef } from "react";
import { useTranslations } from "use-intl";

type LicenseCode = "cc_by_4_0" | "cc0_1_0";
type AttributedResourceUse =
  | {
      type: "licensed" | "self";
      licenseCode: LicenseCode;
    }
  | "permission";

interface AttributedResource {
  name: string;
  author: string;
  use: AttributedResourceUse;
  link: string;
  plural?: true;
}

interface AttributionLicense {
  name: string;
  link: string;
}

export default function AttributionDialog({
  isOT,
  language,
}: {
  isOT: boolean;
  language: {
    code: string;
    englishName: string;
  };
}) {
  const t = useTranslations("AttributionDialog");

  const dialogRef = useRef<HTMLDialogElement>(null);

  const resources: Array<AttributedResource> = [];

  if (!isOT) {
    resources.push({
      name: "Statistical Restoration Greek New Testament",
      author: "Allan Bunning and the Center for New Testament Restoration",
      link: "https://github.com/Center-for-New-Testament-Restoration/SR",
      use: {
        type: "licensed",
        licenseCode: "cc_by_4_0",
      },
    });
  }

  if (language.code === "eng" && !isOT) {
    resources.push({
      name: "English Glosses",
      author: "Allan Bunning and the Center for New Testament Restoration",
      link: "https://github.com/Center-for-New-Testament-Restoration/SR",
      plural: true,
      use: "permission",
    });
  } else {
    resources.push({
      name: `${language.englishName} Glosses`,
      author: "Global Bible Tools",
      link: `https://github.com/globalbibletools/data/tree/main/${language.code}`,
      plural: true,
      use: {
        type: "self",
        licenseCode: "cc0_1_0",
      },
    });
  }

  return (
    <>
      <Button
        variant="link"
        onClick={() => {
          dialogRef.current?.showModal();
        }}
      >
        {t("open")}
      </Button>
      <dialog
        ref={dialogRef}
        className="
        fixed max-w-[600px] max-h-11/12 m-auto max-[632px]:mx-4
        rounded-lg shadow-md border border-gray-201 bg-white mx-auto p-8 focus-visible:outline-2 outline-green-301
        dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300
        backdrop:overscroll-contain
      "
      >
        <button
          type="button"
          className="absolute text-red-700 top-1 end-1 w-8 h-8 outline-green-300 outline-2 rounded-sm"
          onClick={(e) => {
            e.currentTarget.closest("dialog")?.close();
          }}
        >
          <Icon icon="xmark" />
          <span className="sr-only">{t("close")}</span>
        </button>
        <h1 className="font-bold text-lg mb-2">{t("title")}</h1>
        <ul className="overflow-y-auto -mx-8 px-8">
          {resources.map((resource) => (
            <li key={resource.name} className="mb-3">
              {(() => {
                const resourceSize = resource.plural ? 1000 : 1;

                if (resource.use === "permission") {
                  return t.rich("resource_permission", {
                    resourceSize,
                    author: resource.author,
                    resourceLink: () => (
                      <Button variant="link" href={resource.link} newTab>
                        {resource.name} <Icon icon="external-link" size="xs" />
                      </Button>
                    ),
                  });
                } else if (resource.use.type === "self") {
                  const license = t.raw(
                    `licenses.${resource.use.licenseCode}`,
                  ) as AttributionLicense;

                  return t.rich("resource_self", {
                    resourceSize,
                    author: resource.author,
                    resourceLink: () => (
                      <Button variant="link" href={resource.link} newTab>
                        {resource.name} <Icon icon="external-link" size="xs" />
                      </Button>
                    ),
                    licenseLink: () => (
                      <Button variant="link" href={license.link} newTab>
                        {license.name} <Icon icon="external-link" size="xs" />
                      </Button>
                    ),
                  });
                } else {
                  const license = t.raw(
                    `licenses.${resource.use.licenseCode}`,
                  ) as AttributionLicense;

                  return t.rich("resource_licensed", {
                    resourceSize,
                    author: resource.author,
                    resourceLink: () => (
                      <Button variant="link" href={resource.link} newTab>
                        {resource.name} <Icon icon="external-link" size="xs" />
                      </Button>
                    ),
                    licenseLink: () => (
                      <Button variant="link" href={license.link} newTab>
                        {license.name} <Icon icon="external-link" size="xs" />
                      </Button>
                    ),
                  });
                }
              })()}
            </li>
          ))}
        </ul>
      </dialog>
    </>
  );
}
