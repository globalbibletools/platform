"use client";
import { FormContextProvider } from "@/app/components/FormContext";
import { ReactNode, useEffect, useRef, useState } from "react";
import { useFormState } from "react-dom";

export default function ProfileForm({
  children,
  user,
  submitAction,
}: {
  children: ReactNode;
  user: any;
  submitAction: (state: any, data: FormData) => Promise<any>;
}) {
  const [state, formAction] = useFormState(submitAction, {});
  const formRef = useRef<HTMLFormElement>(null);
  const [shouldClearFormData, setShouldClearFormData] = useState(false);

  useEffect(() => {
    if (shouldClearFormData) {
      ((formRef.current?.querySelector("input#password") as any) ?? {}).value =
        "";
      (
        (formRef.current?.querySelector("input#confirm-password") as any) ?? {}
      ).value = "";
      setShouldClearFormData(false);
    }
  }, [shouldClearFormData]);

  return (
    <form
      ref={formRef}
      action={(formData) => {
        formAction(formData);
        setShouldClearFormData(true);
      }}
    >
      <FormContextProvider value={state}>{children}</FormContextProvider>
    </form>
  );
}
