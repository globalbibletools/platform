"use client";

import { ReactNode, createContext, useContext, useState } from "react";
import NavLink, { NavLinkProps } from "@/components/NavLink";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import Link from "next/link";
import { Icon } from "@/components/Icon";

export interface HeaderLinkProps extends NavLinkProps {
  href: string;
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
  return (
    <NavLink
      {...props}
      className={(isActive) => `
            h-full px-2 text-center block pt-5 font-bold border-b-4
            text-blue-800 dark:text-green-400
            hover:underline focus:underline outline-none
            ${
              isActive ?
                "border-green-300 dark:border-blue-800"
              : "border-transparent"
            }
            ${className}
          `}
      target={newTab ? "_blank" : props.target}
      rel={newTab ? "noopener" : props.rel}
    >
      {children}
    </NavLink>
  );
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

export function HeaderDropdownItem({
  children,
  className,
  newTab = false,
  ...props
}: HeaderLinkProps) {
  return (
    <MenuItem>
      <Link
        {...props}
        className={`
                h-8 px-4 py-1 whitespace-nowrap ui-active:underline hover:underline text-blue-800 dark:text-green-400
                ${className}
            `}
        target={newTab ? "_blank" : props.target}
        rel={newTab ? "noopener" : props.rel}
      >
        {children}
      </Link>
    </MenuItem>
  );
}

interface HeaderMenuContextValue {
  isOpen: boolean;
  setOpenState(isOpen: boolean): void;
}
const HeaderMenuContext = createContext<HeaderMenuContextValue | null>(null);

export function HeaderMenu({ children }: { children: ReactNode }) {
  const [isOpen, setOpenState] = useState(false);

  return (
    <HeaderMenuContext.Provider value={{ isOpen, setOpenState }}>
      {children}
    </HeaderMenuContext.Provider>
  );
}

export function HeaderMenuButton({ className = "" }: { className: string }) {
  const context = useContext(HeaderMenuContext);
  if (!context) throw new Error("HeaderMenuButton must be inside HeaderMenu");

  return (
    <button
      type="button"
      className={`
            w-10 h-10 outline-green-300 rounded text-blue-800 dark:text-green-400
            ${className}
        `}
      onClick={() => setTimeout(() => context.setOpenState(!context.isOpen))}
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
  const context = useContext(HeaderMenuContext);
  if (!context) throw new Error("HeaderMenuItems must be inside HeaderMenu");
  if (!context.isOpen) return null;

  return (
    <div
      className={`
            fixed left-0 top-16 w-full h-[calc(100%-64px)] z-10
            ${className}
        `}
      onClick={() => context.setOpenState(false)}
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

export function HeaderMenuItem({
  children,
  className,
  newTab = false,
  ...props
}: HeaderLinkProps) {
  const context = useContext(HeaderMenuContext);
  if (!context) throw new Error("HeaderMenuItem must be inside HeaderMenu");

  return (
    <Link
      {...props}
      className={`
                h-8 px-4 py-1 whitespace-nowrap focus:underline hover:underline outline-none text-blue-800 dark:text-green-400
                ${className}
            `}
      target={newTab ? "_blank" : props.target}
      rel={newTab ? "noopener" : props.rel}
      onClick={() => context.setOpenState(false)}
    >
      {children}
    </Link>
  );
}
