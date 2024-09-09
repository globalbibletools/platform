"use client";
import { FormContextProvider } from "@/app/components/FormContext";
import { ReactNode, useEffect, useRef, useState } from "react";
import { useFormState } from "react-dom";
import updateProfile, { ProfileState } from "./actions";

export default function ProfileForm({
  children,
  user,
}: {
  children: ReactNode;
  user: any;
}) {
  const [state, formAction] = useFormState(
    async (state: ProfileState, data: FormData) => {
      const formSubmissionState = await updateProfile(state, data);
      if (!formSubmissionState.errors) {
        setShouldClearFormData(true);
      }
      return formSubmissionState;
    },
    {}
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [shouldClearFormData, setShouldClearFormData] = useState(false);

  useEffect(() => {
    if (shouldClearFormData) {
      ((formRef.current?.querySelector("#password") as any) ?? {}).value = "";
      (
        (formRef.current?.querySelector("#confirm-password") as any) ?? {}
      ).value = "";
      setShouldClearFormData(false);
    }
  }, [shouldClearFormData]);

  return (
    <form ref={formRef} action={formAction}>
      <FormContextProvider value={state}>{children}</FormContextProvider>
    </form>
  );
}
