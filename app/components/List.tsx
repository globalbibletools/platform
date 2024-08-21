import { ReactNode } from 'react';
import Button from './Button';
import { LinkProps } from 'next/link';

export interface ListProps {
  children?: ReactNode;
  className?: string;
}

export function List({ children, className = '' }: ListProps) {
  return <table className={`${className}`}>{children}</table>;
}

export interface ListHeaderProps {
  children?: ReactNode;
}

export function ListHeader({ children }: ListHeaderProps) {
  return (
    <thead>
      <tr>{children}</tr>
    </thead>
  );
}

export interface ListHeaderCellProps {
  children?: ReactNode;
  className?: string;
}

export function ListHeaderCell({
  children,
  className = '',
}: ListHeaderCellProps) {
  return (
    <th
      className={`
        border-b-2 border-green-300 dark:border-blue-800 text-start text-sm uppercase first:ps-4 last:pe-4
        ${className}
      `}
    >
      {children}
    </th>
  );
}

export interface ListRowActionProps {
  children?: ReactNode;
  colSpan: number;
  href?: LinkProps['href'];
  onClick?(): void;
}

export function ListRowAction({ colSpan, ...props }: ListRowActionProps) {
  return (
    <tbody>
      <tr className="h-10 border-b-2 border-green-300 dark:border-blue-800">
        <td colSpan={colSpan} className="px-1">
          <Button {...props} variant="tertiary" />
        </td>
      </tr>
    </tbody>
  );
}

export interface ListBodyProps {
  children?: ReactNode;
}

export function ListBody({ children }: ListBodyProps) {
  return <tbody>{children}</tbody>;
}

export interface ListRowProps {
  className?: string;
  children?: ReactNode;
}

export function ListRow({ children, className = '' }: ListRowProps) {
  return (
    <tr
      className={`h-8 border-green-200 dark:border-green-700 border-b ${className}`}
    >
      {children}
    </tr>
  );
}

export interface ListCellProps {
  children?: ReactNode;
  header?: boolean;
  className?: string;
}

export function ListCell({
  children,
  header = false,
  className = '',
}: ListCellProps) {
  if (header) {
    return (
      <th className={`text-start font-bold first:ps-4 last:pe-4 ${className}`}>
        {children}
      </th>
    );
  } else {
    return (
      <td className={`text-start first:ps-4 last:pe-4 ${className}`}>
        {children}
      </td>
    );
  }
}

