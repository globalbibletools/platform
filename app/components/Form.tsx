"use client";
import { createContext, ReactNode, useContext, useEffect } from 'react';
import { useFormState } from 'react-dom'

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

    useEffect(() => {
        if (state.state === 'error' && state.error) {
            alert(`ERROR: ${state.error}`)
        } else if (state.state === 'success' && state.message) {
            alert(state.message)
        }
    }, [state])

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
