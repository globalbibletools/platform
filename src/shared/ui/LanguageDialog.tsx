"use client";

import { useRef } from "react";
import Button from "@/components/Button";
import { Icon } from "@/components/Icon";
import ComboboxInput from "@/components/ComboboxInput";
import { getCurrentLocale, locales } from "@/shared/i18n/shared";
import { useLocation, useNavigate, useRouter } from "@tanstack/react-router";

export default function LanguageDialog() {
  const locale = getCurrentLocale();
  const pathname = useLocation({ select: ({ pathname }) => pathname });
  const router = useRouter();

  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <Button variant="tertiary" onClick={() => dialogRef.current?.show()}>
        <Icon icon="language" className="me-2" />
        {locale.name}
      </Button>
      <dialog
        ref={dialogRef}
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
          value={locale.code}
          onChange={async (language) => {
            await router.navigate({
              to: `/${language}${pathname}`,
            });
            await router.invalidate();
          }}
          aria-label="Interface Language"
          up
          items={locales.map((locale) => ({
            label: locale.name,
            value: locale.code,
          }))}
        />
        <Button
          className="absolute right-2 top-2 w-9"
          variant="tertiary"
          destructive
          onClick={() => dialogRef.current?.close()}
        >
          <Icon icon="xmark" />
          <span className="sr-only">Close</span>
        </Button>
      </dialog>
    </>
  );
}
