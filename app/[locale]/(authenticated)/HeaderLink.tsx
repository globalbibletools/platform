"use client";

import Link, { LinkProps } from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

export interface HeaderLinkProps {
    href: LinkProps['href'],
    children?: ReactNode
}

export default function HeaderLink({ children, href }: HeaderLinkProps) {
    const pathname = usePathname()
    const linkPathname = href instanceof URL ? href.pathname : href.toString()
    const isActive = linkPathname.startsWith(pathname)

    return <Link
        href={href}
        className={`
            h-full px-2 text-center block pt-[28px] md:pt-[30px] font-bold md:mx-2 border-b-4
            ${isActive
                ? 'border-blue-800 dark:border-green-400'
                : 'border-transparent'}
          `}
    >
        {children}
    </Link>
}
