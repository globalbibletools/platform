"use client";
import { FormContextProvider } from "@/app/components/FormContext";
import { ReactNode, useRef } from "react";
import { useFormState } from "react-dom";
import updateProfile, { ProfileState } from "./actions";

export default function ProfileForm({
  children,
  userId,
}: {
  children: ReactNode;
  userId: string;
}) {
  const [state, formAction] = useFormState(
    async (prevState: ProfileState, data: FormData) => {
      const formSubmissionState = await updateProfile(userId, data);
      if (formSubmissionState.errors) {
        return formSubmissionState;
      }

      const passwordInput: HTMLInputElement | null | undefined =
        formRef.current?.querySelector("#password");
      if (passwordInput) passwordInput.value = "";
      const confirmPasswordInput: HTMLInputElement | null | undefined =
        formRef.current?.querySelector("#confirm-password");
      if (confirmPasswordInput) confirmPasswordInput.value = "";

      return formSubmissionState;
    },
    {}
  );
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={formAction}>
      <FormContextProvider value={state}>{children}</FormContextProvider>
    </form>
  );
}
