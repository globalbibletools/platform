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
      id?: string;
    } & any
  >(submitAction, {
    ...user,
    password: "",
    confirmPassword: "",
  });

  return (
    <form onSubmit={formAction}>
      <FormContextProvider value={state}>{children}</FormContextProvider>
    </form>
  );
}
