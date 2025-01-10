"use client";

import { ComponentProps, ReactNode, createContext, useContext } from "react";
import { useFormContext } from "./Form";

interface ButtonSelectorContextValue {
  name: string;
  value?: string;
  defaultValue?: string;
  hasErrors: boolean;
  autosubmit: boolean;
  onChange?(value: string): void;
}

const ButtonSelectorContext = createContext<ButtonSelectorContextValue | null>(
  null,
);

export interface ButtonSelectorInputProps
  extends Omit<
    ComponentProps<"fieldset">,
    "defaultValue" | "value" | "onChange"
  > {
  name: string;
  value?: string;
  defaultValue?: string;
  autosubmit?: boolean;
  onChange?(value: string): void;
}

export function ButtonSelectorInput({
  value,
  onChange,
  children,
  name,
  defaultValue,
  autosubmit = false,
  ...props
}: ButtonSelectorInputProps) {
  const formContext = useFormContext();
  const hasErrors =
    formContext?.state === "error" &&
    (formContext.validation?.[name ?? ""]?.length ?? 0) > 0;

  return (
    <ButtonSelectorContext.Provider
      value={{
        name,
        defaultValue,
        hasErrors,
        value,
        onChange,
        autosubmit,
      }}
    >
      <fieldset
        className={`
          inline-block rounded-lg shadow-md dark:shadow-none
          has-[:focus-visible]:outline outline-2
          ${
            hasErrors ?
              "focus-within:outline-red-700"
            : "focus-within:outline-green-300"
          }
        `}
        {...props}
      >
        {children}
      </fieldset>
    </ButtonSelectorContext.Provider>
  );
}

export interface ButtonSelectorOptionProps {
  value: string;
  children: ReactNode;
}

export function ButtonSelectorOption({
  value,
  children,
}: ButtonSelectorOptionProps) {
  const selectorContext = useContext(ButtonSelectorContext);
  if (!selectorContext)
    throw new Error("ButtonSelectorOption must be within a ButtonSelector");

  return (
    <label
      className={`
        inline-flex items-center justify-center px-3 font-bold h-9 bg-white border border-l-0
        ltr:first:rounded-l-lg ltr:first:border-l ltr:last:rounded-r-lg
        rtl:last:rounded-l-lg rtl:last:border-l rtl:first:rounded-r-lg
        text-blue-800 has-[:not(:checked)]:shadow-inner
        has-[:checked]:bg-blue-800 has-[:checked]:text-white
        dark:text-green-400 dark:bg-gray-800 dark:has-[:checked]:bg-green-400 dark:has-[:checked]:text-gray-800 dark:shadow-none
        ${
          selectorContext.hasErrors ?
            "border-red-700 shadow-red-100"
          : "border-blue-800 dark:border-green-400"
        }
      `}
    >
      <input
        className="absolute opacity-0"
        type="radio"
        name={selectorContext.name}
        value={value}
        checked={
          selectorContext.value ? selectorContext.value === value : undefined
        }
        defaultChecked={
          selectorContext.defaultValue ?
            selectorContext.defaultValue === value
          : undefined
        }
        onChange={(e) => {
          if (selectorContext.autosubmit) {
            e.target.form?.requestSubmit();
          }
          selectorContext.onChange?.(e.target.value);
        }}
      />
      {children}
    </label>
  );
}
