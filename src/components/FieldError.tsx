"use client";

import { useFormContext } from "./Form";

export interface FieldErrorProps {
  id?: string;
  name: string;
  messages?: Record<string, string>;
  error?: string;
}

export default function FieldError({
  id,
  name,
  messages,
  error,
}: FieldErrorProps) {
  const formContext = useFormContext();
  const errors =
    formContext?.state === "error" ? formContext.validation?.[name] : undefined;

  let errorMessage;
  if (error) {
    errorMessage = error;
  } else if (errors?.[0]) {
    errorMessage = messages?.[errors[0]] ?? "Invalid";
  }

  if (!errorMessage) return null;

  return (
    <div id={id} className="text-red-700 text-sm">
      {error ?? errorMessage}
    </div>
  );
}
