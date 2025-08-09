import { ReactNode, useState } from "react";
import { Switch } from "@headlessui/react";

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
    <Switch.Group as="div" className={`${className} flex items-center`}>
      <Switch
        {...props}
        className={`
                    ui-checked:bg-blue-800 ui-not-checked:bg-gray-300 shadow-inner
                    dark:ui-checked:bg-green-400 dark:ui-not-checked:bg-gray-700 dark:shadow-none
                    relative inline-flex h-6 w-11 items-center rounded-full
                `}
      >
        <span className="sr-only">children</span>
        <span
          className={`
                        ui-checked:translate-x-6 ui-not-checked:translate-x-1
                        inline-block h-4 w-4 transform rounded-full bg-white transition
                    `}
        />
      </Switch>
      <Switch.Label className="ms-2">{children}</Switch.Label>
    </Switch.Group>
  );
}
