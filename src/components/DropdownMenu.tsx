"use client";

import { FocusEvent, ReactNode, useRef, useState } from "react";
import Link, { LinkProps } from "next/link";
import useCssId from "./cssid";
import { Icon } from "./Icon";

export interface DropdownProps {
  className?: string;
  buttonClassName?: string;
  text: string;
  children: ReactNode;
}

export default function DropdownMenu({
  className = "",
  buttonClassName = "",
  children,
  text,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const cssId = useCssId("dropdown-menu");

  // We want to close the menu if the focus moves outside of the component.
  function onBlur(e: FocusEvent) {
    const focusedElement = e.relatedTarget;
    const isInComponent =
      focusedElement instanceof Node && root.current?.contains(focusedElement);
    if (!isInComponent) {
      setIsOpen(false);
    }
  }

  return (
    <div
      ref={root}
      className={`relative inline-block ${className}`}
      onBlur={onBlur}
    >
      <button
        className={`focus:outline-none hover:underline focus:underline ${buttonClassName}`}
        type="button"
        onClick={() => setIsOpen((menu) => !menu)}
        aria-expanded={isOpen}
        aria-controls={`${cssId}-menu`}
      >
        {text}
        <Icon fixedWidth icon={isOpen ? "caret-up" : "caret-down"} />
      </button>
      <ul
        id={`${cssId}-menu`}
        className={`
          absolute end-0 border border-gray-300 shadow-md py-2 rounded bg-white z-10 min-w-full
          dark:bg-gray-800 dark:border-gray-700
          ${isOpen ? "" : "hidden"}
        `}
        onClick={() => setIsOpen(false)}
      >
        {children}
      </ul>
    </div>
  );
}

export interface DropdownMenuItemProps {
  children: ReactNode;
  href?: LinkProps["href"];
  prefetch?: boolean;
  onClick?(): void;
}

const className =
  "focus:outline-none focus:bg-gray-200 hover:bg-gray-200 block whitespace-nowrap px-4 py-1 text-start w-full";

export function DropdownMenuItem({
  children,
  href,
  onClick,
  prefetch,
}: DropdownMenuItemProps) {
  return (
    <li className="w-full">
      {/* If we want to link to external URLs, we have use a standard anchor element. */}
      {(() => {
        if (typeof href === "string" && href.startsWith("http")) {
          return (
            <a className={className} href={href} onClick={onClick}>
              {children}
            </a>
          );
        } else if (href) {
          return (
            <Link
              className={className}
              href={href}
              onClick={onClick}
              prefetch={prefetch}
            >
              {children}
            </Link>
          );
        } else {
          return (
            <button type="button" className={className} onClick={onClick}>
              {children}
            </button>
          );
        }
      })()}
    </li>
  );
}

export interface DropdownMenuSubmenuProps {
  children: ReactNode;
  text: string;
}

export function DropdownMenuSubmenu({
  children,
  text,
}: DropdownMenuSubmenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const root = useRef<HTMLLIElement>(null);
  const cssId = useCssId("dropdown-menu");

  // We want to close the menu if the focus moves outside of the component.
  function onBlur(e: FocusEvent) {
    const focusedElement = e.relatedTarget;
    const isInComponent =
      focusedElement instanceof Node && root.current?.contains(focusedElement);
    if (!isInComponent) {
      setIsOpen(false);
    }
  }

  return (
    <li ref={root} className="relative" onBlur={onBlur}>
      <button
        className="focus:outline-none focus:underline hover:underline whitespace-nowrap px-4 py-1 text-start w-full"
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((menu) => !menu);
        }}
        aria-expanded={isOpen}
        aria-controls={`${cssId}-menu`}
      >
        {text}
        <Icon fixedWidth icon={isOpen ? "caret-up" : "caret-down"} />
      </button>
      <ul
        id={`${cssId}-menu`}
        className={`
          absolute end-0 border border-slate-300 shadow-md py-2 rounded bg-white
          ${isOpen ? "" : "hidden"}
        `}
        onClick={() => setIsOpen(false)}
      >
        {children}
      </ul>
    </li>
  );
}
