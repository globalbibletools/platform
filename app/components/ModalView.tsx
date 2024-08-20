import Link from 'next/link';
import { ReactNode, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import logo from '../../assets/images/bet-scroll.png';
import { Icon } from './Icon';
// import LanguageDialog, { LanguageDialogRef } from './LanguageDialog';
import Button from './Button';
import { initialLanguageChosen } from '../../app/i18n';
import interfaceLanguages from '../languages.json';

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
  /*
  const { t, i18n } = useTranslation(['common', 'languages']);

  const languageDialog = useRef<LanguageDialogRef>(null);
  useEffect(() => {
    if (!initialLanguageChosen) {
      languageDialog.current?.show();
    }
  }, []);
  */

  return (
    <div
      className={`flex-shrink p-6 m-4 bg-white dark:bg-gray-800 rounded-2xl shadow-lg dark:shadow-none ${className}`}
    >
      <div className="flex items-center mb-8">
        <Link
          className="flex items-center rounded focus-visible:outline outline-2 outline-green-300"
          href="/"
        >
          <img src="/bet-scroll.png" alt="" className="w-10 h-10" />
          <h1 className="font-bold mx-2">Global Bible Tools</h1>
        </Link>
        <div className="flex-grow flex justify-end items-center">{header}</div>
      </div>
      {children}
      {/*
      <div className="flex justify-end mt-16">
        <Button
          variant="tertiary"
          onClick={() => {
            languageDialog.current?.show();
          }}
        >
          <Icon icon="language" className="me-2" fixedWidth />
          {(interfaceLanguages as { [code: string]: string })[
            i18n.resolvedLanguage
          ] ?? t('languages:language', { count: 100 })}
        </Button>
        <LanguageDialog ref={languageDialog} />
      </div>
      */}
    </div>
  );
}

export interface ModalViewTitleProps {
  children: ReactNode;
}

export function ModalViewTitle({ children }: ModalViewTitleProps) {
  return <h1 className="text-2xl font-bold text-center mb-4">{children}</h1>;
}

