"use client";

import { ReactNode } from "react";
import NavLink from "@/app/components/NavLink";

export interface HeaderLinkProps {
    href: string
    children: ReactNode
}

export default function HeaderLink({ href, children }: HeaderLinkProps) {
    return <NavLink
        href={href}
        className={(isActive) => `
            h-full px-2 text-center block pt-[28px] md:pt-[30px] font-bold md:mx-2 border-b-4
            ${
              isActive
                ? 'border-blue-800 dark:border-green-400'
                : 'border-transparent'
            }
          `
        }
    >
        {children}
    </NavLink>
}
