"use client";

import { useRouter } from "next/navigation";
import useSWR from "swr";

export interface PollerProps {
    code: string
}

export default function Poller({ code }: PollerProps) {
    const router = useRouter()

    const { data } = useSWR(['import-progress', code], async ([,code]) => {
        const response = await fetch('./import/progress')
        const body = await response.json()
        return body as { done: boolean }
    }, {
        refreshInterval: 1000
    })

    if (data?.done) {
        router.refresh()
    }

    return <></>
}
