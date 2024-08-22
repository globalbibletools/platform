"use client";

import { ReactNode } from "react";
import { useFormState } from "react-dom";
import { inviteUser } from "./actions";
import { FormContextProvider } from "@/app/components/FormContext";

export default function InviteLanguageUserForm({ children }: { children: ReactNode }) {
    const [state, formAction] = useFormState(inviteUser, {})

    return <form action={formAction}>
        {state.message && <div className="font-bold text-red-700 mb-2">{state.message}</div>}
        <FormContextProvider value={state}>
            {children}
        </FormContextProvider>
    </form>
}

