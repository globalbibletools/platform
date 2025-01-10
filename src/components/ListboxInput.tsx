"use client";

import { Listbox } from "@headlessui/react";
import { ComponentProps, useRef } from "react";
import { useFormContext } from "./Form";
import { Icon } from "./Icon";

export interface ListboxItem {
  label: string;
  value: string;
}

export interface ListboxInputProps {
  className?: string;
  menuClassName?: string;
  name?: string;
  items: ListboxItem[];
  value?: string;
  defaultValue?: string;
  up?: boolean;
  right?: boolean;
  autosubmit?: boolean;
  disabled?: boolean;
  onBlur?(): void;
  onChange?(value: string): void;
}

export default function ListboxInput({
  className = "",
  menuClassName = "",
  value,
  defaultValue,
  onChange,
  onBlur,
  items,
  name,
  up,
  right,
  autosubmit = false,
  disabled = false,
}: ListboxInputProps) {
  const root = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={root}
      className={`${className} relative ${disabled ? "opacity-25" : ""}`}
    >
      <Listbox
        value={value}
        defaultValue={defaultValue}
        name={name}
        disabled={disabled}
        onChange={(value) => {
          if (autosubmit) {
            // We have to wait a tick so that the internal input element is updated when we submit the form
            setTimeout(() => {
              const form = root.current?.closest("form");
              form?.requestSubmit();
            });
          }
          onChange?.(value);
        }}
      >
        <Listbox.Button
          onBlur={onBlur}
          className="font-bold text-blue-800 dark:text-green-400 w-full outline-2 outline-green-300"
        >
          {({ value, open }) => (
            <>
              {items.find((item) => item.value === value)?.label ?? ""}
              <Icon
                icon={open ? "caret-up" : "caret-down"}
                fixedWidth
                className="ms-1"
              />
            </>
          )}
        </Listbox.Button>
        <Listbox.Options
          className={`
                  z-10 absolute w-full max-h-80 bg-white overflow-auto rounded border border-gray-400 shadow
                  dark:bg-gray-700 dark:border-gray-600
                  ${up ? "mt-0 -top-1 transform -translate-y-full" : "mt-1"}
                  ${right ? "end-0" : "start-0"}
                  ${menuClassName}
                `}
        >
          {items.map((item) => (
            <Listbox.Option
              className="px-3 py-2 ui-active:bg-green-200 dark:ui-active:green-400 dark:ui-active:text-gray-800"
              key={item.value}
              value={item.value}
            >
              {item.label}
            </Listbox.Option>
          ))}
        </Listbox.Options>
      </Listbox>
    </div>
  );
}
