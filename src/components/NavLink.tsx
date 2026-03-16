"use client";

import { Link, useLocation } from "@tanstack/react-router";
import { ComponentProps, ReactNode } from "react";

export interface NavLinkProps
  extends Omit<ComponentProps<typeof Link>, "className"> {
  children?: ReactNode;
  className?: string | ((isActive: boolean) => string);
}

export default function NavLink({
  children,
  to,
  className = "",
  ...props
}: NavLinkProps) {
  const pathname = useLocation({ select: ({ pathname }) => pathname });
  const isActive = to ? pathname.startsWith(to) : false;

  return (
    <Link
      {...props}
      to={to}
      className={
        typeof className === "string" ? className : className(isActive)
      }
    >
      {children}
    </Link>
  );
}

export function SidebarLink({ children, to }: Omit<NavLinkProps, "className">) {
  return (
    <NavLink
      to={to}
      className={(isActive) => `
        block px-3 py-1 rounded-lg text-blue-800 dark:text-green-400 font-bold mb-2
        ${isActive ? "bg-green-200 dark:bg-gray-700" : ""}
      `}
    >
      {children}
    </NavLink>
  );
}
