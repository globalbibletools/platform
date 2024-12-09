"use client";

import Button from "@/app/components/Button";
import { resendUserInvite } from "./actions";
import { useFlash } from "@/app/flash";

export interface ResendInviteProps {
    userId: string
}

export default function ResendInviteAction({ userId }: ResendInviteProps) {
    const flash = useFlash()

    async function onClick() {
        const formData = new FormData()
        formData.set('userId', userId)
        const result = await resendUserInvite(formData)
        if (result.state === 'error' && result.error) {
            flash.error(result.error)
        } else if (result.state === 'success' && result.message) {
            flash.success(result.message)
        }
    }

    return <Button variant="link" onClick={onClick}>Resend Invite</Button>
}
