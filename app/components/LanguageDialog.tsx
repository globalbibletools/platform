"use client";

import { useRef } from 'react';
import Button from './Button';
import { Icon } from './Icon';
import languages from '@/languages.json';
import { useParams, useRouter, usePathname } from 'next/navigation'
import ComboboxInput from './ComboboxInput';

export default function LanguageDialog() {
    const { locale } = useParams<{ locale: string }>()
    const router = useRouter()
    const pathName = usePathname()

    const dialog = useRef<HTMLDialogElement>(null);

    return <>
        <Button
          variant="tertiary"
          onClick={() => dialog.current?.show()}
        >
          <Icon icon="language" className="me-2" />
          { languages[locale as keyof typeof languages] }
        </Button>
        <dialog
          ref={dialog}
          className="
            rounded-lg shadow-md border border-gray-200 bg-white mx-auto p-8 focus-visible:outline outline-green-300 outline-2 end-2 bottom-2 start-auto
            dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200
          "
        >
          <h2 className="font-bold text-xl mb-6 text-center">
            <Icon icon="language" className="me-2" />
            Language
          </h2>
          <ComboboxInput
            className="block min-w-[150px]"
            value={locale}
            onChange={(language) => router.push(pathName.replace(new RegExp(`/${locale}(?=/|$)`), `/${language}`))}
            aria-label="Interface Language"
            up
            items={Object.entries(languages).map(([value, label]) => ({
              label,
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
}
