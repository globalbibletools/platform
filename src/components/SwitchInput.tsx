import { ReactNode } from "react";
import { Field, Label, Switch } from "@headlessui/react";

export interface SwitchInputProps {
  className?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  name?: string;
  children?: ReactNode;
  onChange?(checked: boolean): void;
}

export function SwitchInput({
  className = "",
  children,
  ...props
}: SwitchInputProps) {
  return (
    <Field as="div" className={`${className} flex items-center`}>
      <Switch
        {...props}
        className={`
          group
          bg-gray-300 data-checked:bg-blue-800 shadow-inner
          dark:bg-gray-700 dark:data-checked:bg-green-400 dark:shadow-none
          relative inline-flex h-6 w-11 items-center rounded-full
        `}
      >
        <span className="sr-only">children</span>
        <span
          className={`
            translate-x-1 group-data-checked:translate-x-6
            inline-block h-4 w-4 transform rounded-full bg-white transition
          `}
        />
      </Switch>
      <Label className="ms-2">{children}</Label>
    </Field>
  );
}
