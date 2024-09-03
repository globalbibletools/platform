"use client";
import { FormContextProvider } from "@/app/components/FormContext";
import { ReactNode, useRef } from "react";
import { useFormState } from "react-dom";

export default function ProfileForm({
  children,
  user,
  submitAction,
}: {
  children: ReactNode;
  user: any;
  submitAction: (state: any, data: FormData) => any;
}) {
  const [state, formAction] = useFormState(submitAction, {});

  return (
    <form action={formAction}>
      <FormContextProvider value={state}>{children}</FormContextProvider>
    </form>
  );
}
