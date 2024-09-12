"use client";

import { useFormContext } from "./Form";

export interface FieldErrorProps {
  id?: string;
  name: string
}

export default function FieldError({ id, name }: FieldErrorProps) {
    const formContext = useFormContext()
    const errors = formContext?.state === 'error' ? formContext.validation?.[name] : undefined

  if (errors?.[0]) {
    return (
      <div id={id} className="text-red-700 text-sm">
        {errors[0]}
      </div>
    );
  } else {
    return null;
  }
}

