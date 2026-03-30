"use client";

import { ComponentProps, ReactNode, createContext, use, useState } from "react";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { Icon } from "@/components/Icon";
import { Link, LinkProps } from "@tanstack/react-router";

export interface HeaderLinkProps extends LinkProps {
  children: ReactNode;
  className?: string;
  newTab?: boolean;
}

export function HeaderLink({
  className = "",
  newTab = false,
  children,
  ...props
}: HeaderLinkProps) {
  if (props.href) {
    return (
      <a
        {...props}
        className={`
        h-full px-2 text-center block pt-5 font-bold
        text-blue-800 dark:text-green-400
        hover:underline focus:underline outline-none
        ${className}
      `}
        target={newTab ? "_blank" : props.target}
        rel={newTab ? "noopener" : undefined}
      >
        {children}
      </a>
    );
  } else {
    return (
      <Link
        {...props}
        className={`
        h-full px-2 text-center block pt-5 font-bold border-b-4
        text-blue-800 dark:text-green-400
        hover:underline focus:underline outline-none
        ${className}
      `}
        activeProps={() => ({
          className: "border-green-300 dark:border-blue-800",
        })}
        inactiveProps={() => ({
          className: "border-transparent",
        })}
        target={newTab ? "_blank" : props.target}
        rel={newTab ? "noopener" : undefined}
      >
        {children}
      </Link>
    );
  }
}

export interface HeaderDropdownProps {
  button: ReactNode;
  items: ReactNode;
}

export function HeaderDropdown({ button, items }: HeaderDropdownProps) {
  return (
    <Menu as="div" className="relative h-full hidden sm:block">
      <MenuButton
        className="h-full ps-2 font-bold outline-none focus:underline text-blue-800 dark:text-green-400
        "
      >
        {({ open }) => (
          <>
            {button}
            <Icon className="ms-2" icon={open ? "caret-up" : "caret-down"} />
          </>
        )}
      </MenuButton>
      <MenuItems
        className="
                absolute -end-4 flex flex-col pt-3 pb-2 w-fit min-w-[calc(100%+32px)] bg-white z-10
                outline-none
                rounded-b border border-gray-200 shadow-md
                dark:bg-gray-800 dark:border-gray-700 dark:shadow-none
            "
      >
        {items}
      </MenuItems>
    </Menu>
  );
}

export type HeaderDropdownItemProps =
  | HeaderLinkProps
  | ComponentProps<"button">
  | (ComponentProps<"a"> & { newTab?: boolean });

export function HeaderDropdownItem({
  children,
  className,
  ...props
}: HeaderDropdownItemProps) {
  if ("to" in props) {
    const newTab = props.newTab ?? false;
    return (
      <MenuItem>
        <Link
          {...props}
          className={`
              h-8 px-4 py-1 whitespace-nowrap data-focus:underline hover:underline text-blue-800 dark:text-green-400
              ${className}
          `}
          target={newTab ? "_blank" : props.target}
          rel={newTab ? "noopener" : undefined}
        >
          {children}
        </Link>
      </MenuItem>
    );
  } else if ("href" in props) {
    const newTab = props.newTab ?? false;
    return (
      <a
        {...props}
        className={`
            h-8 px-4 py-1 whitespace-nowrap data-focus:underline hover:underline text-blue-800 dark:text-green-400
            ${className}
        `}
        target={newTab ? "_blank" : props.target}
        rel={newTab ? "noopener" : undefined}
      >
        {children}
      </a>
    );
  } else {
    const buttonProps = props as ComponentProps<"button">;
    return (
      <button
        {...buttonProps}
        className={`
            text-left h-8 px-4 py-1 whitespace-nowrap data-focus:underline hover:underline text-blue-800 dark:text-green-400
            ${className}
        `}
      >
        {children}
      </button>
    );
  }
}

interface HeaderMenuContextValue {
  isOpen: boolean;
  setIsOpen(isOpen: boolean): void;
}
const HeaderMenuContext = createContext<HeaderMenuContextValue | null>(null);

export function HeaderMenu({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <HeaderMenuContext value={{ isOpen, setIsOpen }}>
      {children}
    </HeaderMenuContext>
  );
}

export function HeaderMenuButton({ className = "" }: { className: string }) {
  const context = use(HeaderMenuContext);
  if (!context) throw new Error("HeaderMenuButton must be inside HeaderMenu");

  return (
    <button
      type="button"
      className={`
            w-10 h-10 outline-green-300 rounded text-blue-800 dark:text-green-400
            ${className}
        `}
      onClick={() => setTimeout(() => context.setIsOpen(!context.isOpen))}
    >
      <Icon icon={context.isOpen ? "close" : "bars"} size="lg" />
      <span className="sr-only">Menu</span>
    </button>
  );
}

export function HeaderMenuItems({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const context = use(HeaderMenuContext);
  if (!context) throw new Error("HeaderMenuItems must be inside HeaderMenu");
  if (!context.isOpen) return null;

  return (
    <div
      className={`
            fixed left-0 top-16 w-full h-[calc(100%-64px)] z-10
            ${className}
        `}
      onClick={() => context.setIsOpen(false)}
    >
      <div
        className="
                absolute bg-white h-full max-w-full min-w-[180px] w-fit end-0
                flex flex-col items-stretch gap-2
                ltr:border-l rtl:border-r border-gray-200 py-4 shadow-left rtl:shadow-right
                dark:bg-gray-800 dark:shadow-none dark:border-gray-700
            "
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export type HeaderMenuItemProps =
  | HeaderLinkProps
  | ComponentProps<"button">
  | (ComponentProps<"a"> & { newTab?: boolean });

export function HeaderMenuItem({
  children,
  className,
  ...props
}: HeaderMenuItemProps) {
  const context = use(HeaderMenuContext);
  if (!context) throw new Error("HeaderMenuItem must be inside HeaderMenu");

  if ("to" in props) {
    const { newTab, ...restProps } = props;
    return (
      <Link
        {...props}
        className={`
            h-8 px-4 py-1 whitespace-nowrap focus:underline hover:underline outline-hidden text-blue-800 dark:text-green-400
            ${className}
        `}
        target={newTab ? "_blank" : props.target}
        rel={newTab ? "noopener" : undefined}
        onClick={() => context.setIsOpen(false)}
        {...restProps}
      >
        {children}
      </Link>
    );
  } else if ("href" in props) {
    const newTab = props.newTab ?? false;
    return (
      <a
        {...props}
        className={`
            h-8 px-4 py-1 whitespace-nowrap focus:underline hover:underline outline-hidden text-blue-800 dark:text-green-400
            ${className}
        `}
        target={newTab ? "_blank" : props.target}
        rel={newTab ? "noopener" : undefined}
        onClick={() => context.setIsOpen(false)}
      >
        {children}
      </a>
    );
  } else {
    const { onClick, ...buttonProps } = props as ComponentProps<"button">;
    return (
      <button
        {...buttonProps}
        className={`
            text-left h-8 px-4 py-1 whitespace-nowrap focus:underline hover:underline outline-hidden text-blue-800 dark:text-green-400
            ${className}
        `}
        onClick={(e) => {
          onClick?.(e);
          context.setIsOpen(false);
        }}
      >
        {children}
      </button>
    );
  }
}
