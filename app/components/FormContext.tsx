import { createContext, ReactNode, useContext } from "react";

interface FormContextValue {
    message?: string
    errors?: Record<string, string[]>
}

const FormContext = createContext<FormContextValue | undefined>(undefined)

export function FormContextProvider({ value, children }: { value: FormContextValue, children: ReactNode }) {
    return <FormContext.Provider value={value}>
        {children}
    </FormContext.Provider>
}

export function useFormContext(): FormContextValue | undefined {
    return useContext(FormContext)
}
