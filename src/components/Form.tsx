"use client";
import { createContext, ReactNode, useContext, useEffect } from "react";
import { useFormState } from "react-dom";
import { useTranslations } from "next-intl";
import { useFlash } from "../flash";

export type FormState =
  | { state: "idle" }
  | {
      state: "error";
      error?: string;
      errorCode?: string;
      validation?: Record<string, string[]>;
    }
  | { state: "success"; message?: string };

export interface FormProps {
  className?: string;
  children?: ReactNode;
  action: (
    state: Awaited<FormState>,
    formData: FormData,
  ) => FormState | Promise<FormState>;
}

export default function Form({ className = "", children, action }: FormProps) {
  const [state, formAction] = useFormState(action, { state: "idle" });

  const flash = useFlash();
  const t = useTranslations("Form");

  useEffect(() => {
    if (state.state === "error") {
      if (state.errorCode) {
        flash.error(t(`errors.${state.errorCode}` as any));
      } else if (state.error) {
        flash.error(state.error);
      } else {
        flash.error(t("errors.Unknown"));
      }
    } else if (state.state === "success" && state.message) {
      flash.success(state.message);
    }
  }, [state, flash]);

  return (
    <form className={className} action={formAction}>
      <FormContext.Provider value={state}>{children}</FormContext.Provider>
    </form>
  );
}

const FormContext = createContext<FormState | null>(null);

export function useFormContext() {
  return useContext(FormContext);
}
