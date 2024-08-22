"use client";

import { ReactNode } from "react";
import { useFormState } from "react-dom";
import { updateLanguageSettings } from "./actions";
import { FormContextProvider } from "@/app/components/FormContext";

export default function LanguageSettingsForm({ children }: { children: ReactNode }) {
    const [state, formAction] = useFormState(updateLanguageSettings, {})

    return <form action={formAction} className="max-w-[1000px]">
        {state.message && <div className="font-bold text-red-700 mb-2">{state.message}</div>}
        <FormContextProvider value={state}>
            {children}
        </FormContextProvider>
    </form>
}

