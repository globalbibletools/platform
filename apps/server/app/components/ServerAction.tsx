"use client";

import { useFormState } from 'react-dom'
import Button, { ActionProps } from './Button'
import { FormState } from './Form'
import { useEffect } from 'react'
import { useFlash } from '../flash';

export interface ServerActionProps extends ActionProps {
    // At some point, we can allow action data to take nested objects and arrays if we need to.
    actionData?: Record<string, string | number>
    action: (state: Awaited<FormState>, formData: FormData) => FormState | Promise<FormState>
}

export default function ServerAction({ action, actionData, ...props }: ServerActionProps) {
    const [state, serverAction] = useFormState(action, { state: 'idle' })
    const flash = useFlash()

    useEffect(() => {
        if (state.state === 'error' && state.error) {
            flash.error(state.error)
        } else if (state.state === 'success' && state.message) {
            flash.success(state.message)
        }
    }, [state])

    return <Button {...props} onClick={() => {
        const form = new FormData()
        if (actionData) {
            for (const [key, value] of Object.entries(actionData)) {
                form.set(key, value.toString())
            }
        }
        serverAction(form)
    }} />
}
