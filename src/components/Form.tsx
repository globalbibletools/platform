"use client";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { useFlash } from "../flash";
import { OptionalFetcher, useServerFn } from "@tanstack/react-start";
import { ToOptions, useRouter } from "@tanstack/react-router";

export type FormState =
  | { state: "idle" }
  | { state: "error"; error?: string; validation?: Record<string, string[]> }
  | { state: "success"; message?: string };

export interface FormProps {
  className?: string;
  children?: ReactNode;
  action: OptionalFetcher<any, any, any>;
  redirect?: ToOptions;
  successMessage?: string;
  invalidate?: boolean;
}

export default function Form({
  className = "",
  children,
  action,
  redirect,
  successMessage,
  invalidate,
}: FormProps) {
  const serverFn = useServerFn(action);
  const [state, setState] = useState<FormState>({ state: "idle" });

  const router = useRouter();
  const flash = useFlash();

  return (
    <form
      className={className}
      onSubmit={async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        try {
          await serverFn({ data: formData });
          setState({
            state: "success",
          });

          if (invalidate) {
            router.invalidate();
          }

          if (successMessage) {
            flash.success(successMessage);
          }

          if (redirect) {
            await router.navigate(redirect);
          }
        } catch (error) {
          const validation = processValidationError(error);
          flash.error("Failed request"); // TODO: translate this
          if (validation) {
            setState({
              state: "error",
              error: "Invalid request",
              validation,
            });
          } else {
            setState({
              state: "error",
              error: error instanceof Error ? error.message : undefined,
            });
          }
        }
      }}
    >
      <FormContext.Provider value={state}>{children}</FormContext.Provider>
    </form>
  );
}

function processValidationError(error: unknown) {
  if (!(error instanceof Error)) return;

  try {
    const naybeValidationErrors = JSON.parse(error.message);
    if (!Array.isArray(naybeValidationErrors)) return;

    const validationErrors: Record<string, string[]> = {};
    let hasErrors = false;
    for (const entry of naybeValidationErrors) {
      if (!Array.isArray(entry.path)) continue;
      if (typeof entry.path[0] !== "string") continue;

      if (typeof entry.code !== "string") continue;

      const key = entry.path[0];
      const code = entry.code;

      validationErrors[key] ??= [];
      validationErrors[key].push(code);

      hasErrors = true;
    }

    if (hasErrors) {
      return validationErrors;
    }
  } catch {
    return;
  }
}

const FormContext = createContext<FormState | null>(null);

export function useFormContext() {
  return useContext(FormContext);
}
