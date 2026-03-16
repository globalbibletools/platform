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
import { useRouter } from "@tanstack/react-router";

export type FormState =
  | { state: "idle" }
  | { state: "error"; error?: string; validation?: Record<string, string[]> }
  | { state: "success"; message?: string };

export interface FormProps {
  className?: string;
  children?: ReactNode;
  action: OptionalFetcher<any, any, any>;
}

export default function Form({ className = "", children, action }: FormProps) {
  const serverFn = useServerFn(action);
  const [state, setState] = useState<FormState>({ state: "idle" });

  const router = useRouter();
  const flash = useFlash();

  useEffect(() => {
    if (state.state === "error" && state.error) {
      flash.error(state.error);
    } else if (state.state === "success" && state.message) {
      flash.success(state.message);
    }
  }, [state, flash]);

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

          router.invalidate();
        } catch (error) {
          setState({
            state: "error",
            error: error instanceof Error ? error.message : undefined,
          });
        }
      }}
    >
      <FormContext.Provider value={state}>{children}</FormContext.Provider>
    </form>
  );
}

const FormContext = createContext<FormState | null>(null);

export function useFormContext() {
  return useContext(FormContext);
}
