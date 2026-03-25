"use client";

import { Link, LinkProps } from "@tanstack/react-router";

export default function SidebarLink({
  children,
  to,
}: Omit<LinkProps, "className">) {
  return (
    <Link
      to={to}
      className="block px-3 py-1 rounded-lg text-blue-800 dark:text-green-400 font-bold mb-2"
      activeProps={() => ({
        className: "bg-green-200 dark:bg-gray-700",
      })}
    >
      {children}
    </Link>
  );
}
