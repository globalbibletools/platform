"use client";
import { FormContextProvider } from "@/app/components/FormContext";
import { ReactNode } from "react";
import { useFormState } from "react-dom";

export default function ProfileForm({
  children,
  user,
  submitAction,
}: {
  children: ReactNode;
  user: any;
  submitAction: (state: any) => any;
}) {
  const [state, formAction] = useFormState<
    {
      email?: string;
      name?: string;
      password?: string;
      confirmPassword?: string;
      user: any;
    } & any
  >(submitAction, {
    user,
  });

  return (
    <form action={formAction}>
      <FormContextProvider value={state}>{children}</FormContextProvider>
    </form>
  );
}
