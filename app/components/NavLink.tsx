"use client";

import Link, { LinkProps } from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

export interface NavLinkProps {
    href: LinkProps['href'],
    children?: ReactNode
    className?: string | ((isActive: boolean) => string)
}

export default function NavLink({ children, href, className = '' }: NavLinkProps) {
    const pathname = usePathname()
    const linkPathname = href instanceof URL ? href.pathname : href.toString()
    const isActive = linkPathname.startsWith(pathname)

    return <Link
        href={href}
        className={typeof className === 'string' ? className : className(isActive)}
    >
        {children}
    </Link>
}
