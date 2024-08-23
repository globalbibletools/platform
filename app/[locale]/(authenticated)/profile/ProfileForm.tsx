"use client";

import { useFormState } from "react-dom";
import { FormContextProvider } from "@/app/components/FormContext";
import { ReactNode } from "react";
import { query } from "@/app/db";

export default function ProfileForm({
  children,
  user,
}: {
  children: ReactNode;
  user: any;
}) {
  async function onSubmit(state: any) {
    try {
      if (user) {
        query(
          `UPDATE "User" 
                SET "email" = $1, 
                    "name" = $2, 
                    "password" = $3 
              WHERE "id" = $4`,
          [state.email, state.name, state.password, user.id]
        );
      }

      //   flash.success(t("users:profile_updated"));
    } catch (error) {
      //   flash.error(`${error}`);
    }

    return { ...state, password: "", confirmPassword: "" };
  }
  const [state, formAction] = useFormState<{
    email: string;
    name: string;
    password: string;
    confirmPassword: string;
  }>(onSubmit, { email: "", name: "", password: "", confirmPassword: "" });

  return (
    <form action={formAction} onSubmit={onSubmit}>
      <FormContextProvider value={state}>{children}</FormContextProvider>
    </form>
  );
}
