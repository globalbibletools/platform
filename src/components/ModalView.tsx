import Link from 'next/link';
import { ReactNode, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import LanguageDialog from './LanguageDialog';

export interface ModalViewProps {
  className?: string;
  children: ReactNode;
  header?: ReactNode;
}

export default function ModalView({
  children,
  header,
  className = '',
}: ModalViewProps) {
    const t = useTranslations("ModalView")

  return (
    <div
      className={`flex-shrink p-6 m-4 bg-white dark:bg-gray-800 rounded-2xl shadow-lg dark:shadow-none ${className}`}
    >
      <div className="flex items-center mb-12">
        <Link
          className="flex items-center rounded focus-visible:outline outline-2 outline-green-300"
          href="/read"
        >
          <img src="/bet-scroll.png" alt="" className="w-10 h-10" />
          <h1 className="font-bold mx-2">{t("app_name")}</h1>
        </Link>
        <div className="flex-grow flex justify-end items-center">{header}</div>
      </div>
      {children}
      <div className="flex justify-end mt-16">
        <LanguageDialog />
      </div>
    </div>
  );
}

export interface ModalViewTitleProps {
  children: ReactNode;
}

export function ModalViewTitle({ children }: ModalViewTitleProps) {
  return <h1 className="text-2xl font-bold text-center mb-4">{children}</h1>;
}

