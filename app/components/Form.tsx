"use client";
import { createContext, ReactNode, useContext, useEffect } from 'react';
import { useFormState } from 'react-dom'
import { useFlash } from '../flash';

export type FormState =
    | { state: 'idle' }
    | { state: 'error', error?: string, validation?: Record<string, string[]> }
    | { state: 'success', message?: string }

export interface FormProps {
    className?: string
    children?: ReactNode
    action: (state: Awaited<FormState>, formData: FormData) => FormState | Promise<FormState>,
}

export default function Form({ className = '', children, action }: FormProps) {
    const [state, formAction] = useFormState(action, { state: 'idle' })

    const flash = useFlash()

    useEffect(() => {
        if (state.state === 'error' && state.error) {
            flash.error(state.error)
        } else if (state.state === 'success' && state.message) {
            flash.success(state.message)
        }
    }, [state, flash])

    return <form className={className} action={formAction}>
        <FormContext.Provider value={state}>
            {children}
        </FormContext.Provider>
    </form>
}

const FormContext = createContext<FormState | null>(null)

export function useFormContext() {
    return useContext(FormContext)
}
