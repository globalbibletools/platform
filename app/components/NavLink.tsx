"use client";

import Link, { LinkProps } from "next/link";
import { usePathname } from "next/navigation";
import { ComponentProps, ReactNode } from "react";

export interface NavLinkProps extends Omit<ComponentProps<typeof Link>, 'className'> {
    href: LinkProps['href'],
    children?: ReactNode
    className?: string | ((isActive: boolean) => string)
}

export default function NavLink({ children, href, className = '', ...props }: NavLinkProps) {
    const pathname = usePathname()
    const linkPathname = href instanceof URL ? href.pathname : href.toString()
    const isActive = pathname.startsWith(linkPathname)

    return <Link
        {...props}
        href={href}
        className={typeof className === 'string' ? className : className(isActive)}
    >
        {children}
    </Link>
}

export function SidebarLink({ children, href }: Omit<NavLinkProps, 'className'>) {
    return <NavLink
        href={href}
        className={isActive => `
            block px-3 py-1 rounded-lg text-blue-800 dark:text-green-400 font-bold mb-2
            ${ isActive ? 'bg-green-200 dark:bg-gray-600' : '' }
        `}
    >
        {children}
    </NavLink>
}
