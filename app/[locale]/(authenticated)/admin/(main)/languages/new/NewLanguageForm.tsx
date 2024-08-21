"use client";

import { ReactNode } from "react";
import { useFormState } from "react-dom";
import { createLanguage } from "./actions";
import { FormContextProvider } from "@/app/components/FormContext";

export default function LoginForm({ children }: { children: ReactNode }) {
    const [state, formAction] = useFormState(createLanguage, {})

    return <form className="max-w-[300px] w-full mx-auto" action={formAction}>
        {state.message && <div className="font-bold text-red-700 mb-2">{state.message}</div>}
        <FormContextProvider value={state}>
            {children}
        </FormContextProvider>
    </form>
}

