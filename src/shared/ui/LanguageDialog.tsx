"use client";

import { useRef } from "react";
import Button from "@/components/Button";
import { Icon } from "@/components/Icon";
import languages from "@/languages.json" assert { type: "json" };
import { useParams, usePathname } from "next/navigation";
import ComboboxInput from "@/components/ComboboxInput";

export default function LanguageDialog() {
  const { locale } = useParams<{ locale: string }>();
  const pathName = usePathname();

  const dialog = useRef<HTMLDialogElement>(null);

  return (
    <>
      <Button variant="tertiary" onClick={() => dialog.current?.show()}>
        <Icon icon="language" className="me-2" />
        {languages[locale as keyof typeof languages]?.name}
      </Button>
      <dialog
        ref={dialog}
        className="
            rounded-lg shadow-md border border-gray-200 bg-white mx-auto p-8 focus-visible:outline-2 outline-green-300 start-3 bottom-2 end-auto
            dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300
          "
      >
        <h2 className="font-bold text-xl mb-6 text-center">
          <Icon icon="language" className="me-2" />
          Language
        </h2>
        <ComboboxInput
          className="block min-w-[150px]"
          value={locale}
          onChange={(language) => {
            // We need to do a hard refresh so that the tawk.to chat widget will reload with settings for the new language.
            window.location.href = new URL(
              pathName.replace(new RegExp(`/${locale}(?=/|$)`), `/${language}`),
              window.location.origin,
            ).toString();
          }}
          aria-label="Interface Language"
          up
          items={Object.entries(languages).map(([value, config]) => ({
            label: config.name,
            value,
          }))}
        />
        <Button
          className="absolute right-2 top-2 w-9"
          variant="tertiary"
          destructive
          onClick={() => dialog.current?.close()}
        >
          <Icon icon="xmark" />
          <span className="sr-only">Close</span>
        </Button>
      </dialog>
    </>
  );
}
