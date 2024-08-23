"use client";

import Button from "@/app/components/Button";
import { Icon } from "@/app/components/Icon";
import { removeLanguageUser } from "./actions";
import { useFormState } from "react-dom";

export interface RemoveUserButtonProps {
    userId: string
    code: string
    label: string
}

export default function RemoveUserButton({ userId, code, label }: RemoveUserButtonProps) {
    const [state, action] = useFormState(removeLanguageUser, {})
    return <Button
      variant="tertiary"
      className="text-red-700 ms-2 -me-2"
      destructive
      onClick={() => {
          const form = new FormData()
          form.set('user_id', userId)
          form.set('code', code)
          action(form)
      }}
    >
      <Icon icon="xmark" />
      <span className="sr-only">{label}</span>
    </Button>
}
