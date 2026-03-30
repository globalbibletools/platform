"use client";

import { useFormContext } from "./Form";

export interface FieldErrorProps {
  id?: string;
  name: string;
  messages?: Record<string, string>;
}

export default function FieldError({ id, name, messages }: FieldErrorProps) {
  const formContext = useFormContext();
  const errors =
    formContext?.state === "error" ? formContext.validation?.[name] : undefined;

  if (!errors || errors.length === 0) return null;

  const errorMessage = messages?.[errors[0]] ?? "Invalid";
  return (
    <div id={id} className="text-red-700 text-sm">
      {errorMessage}
    </div>
  );
}
