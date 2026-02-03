"use client";

import { forwardRef, useMemo, useRef } from "react";
import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from "@headlessui/react";
import { Icon } from "./Icon";
import { useFormContext } from "./Form";
import debounce from "./debounce";

export interface MultiselectInputProps {
  className?: string;
  name?: string;
  items: { label: string; value: string }[];
  value?: string[];
  defaultValue?: string[];
  placeholder?: string;
  autosubmit?: boolean;
  onChange?(value: string[]): void;
  onBlur?(): void;
}

const MultiselectInput = forwardRef<HTMLInputElement, MultiselectInputProps>(
  (
    {
      className = "",
      value,
      onChange,
      onBlur,
      items,
      name,
      defaultValue,
      placeholder,
      autosubmit,
    },
    ref,
  ) => {
    const formContext = useFormContext();
    const hasErrors =
      formContext?.state === "error" &&
      (formContext.validation?.[name ?? ""]?.length ?? 0) > 0;

    const root = useRef<HTMLDivElement>(null);
    const autosubmitForm = useMemo(
      () =>
        autosubmit ?
          debounce(() => {
            root.current?.closest("form")?.requestSubmit();
          }, 1000)
        : undefined,
      [autosubmit],
    );

    return (
      <div ref={root} className={`${className} relative`}>
        <Combobox
          value={value}
          onChange={(value) => {
            autosubmitForm?.();
            onChange?.(value);
          }}
          multiple
          name={name}
          defaultValue={defaultValue}
        >
          <div
            className={`
            border rounded shadow-inner flex h-9
            has-focus-visible:outline-solid outline-2
            bg-white dark:bg-gray-900
            ${
              hasErrors ?
                "border-red-700 shadow-red-100 outline-red-700"
              : "border-gray-400 dark:border-gray-700 outline-green-300"
            }
          `}
          >
            <ComboboxInput
              className="w-full py-2 px-3 h-full grow focus:outline-hidden bg-transparent rounded-sm"
              readOnly
              ref={ref}
              onBlur={onBlur}
              displayValue={(value: string[]) =>
                value
                  .map((v) => items.find((i) => i.value === v)?.label ?? "")
                  .join(", ")
              }
              placeholder={placeholder}
            />
            <ComboboxButton className="w-8">
              {({ open }) => <Icon icon={open ? "caret-up" : "caret-down"} />}
            </ComboboxButton>
          </div>
          <ComboboxOptions
            className="
              absolute z-20 mt-1 max-h-80 w-full overflow-auto rounded border border-gray-400 bg-white shadow
              dark:bg-gray-800 dark:border-gray-700
            "
          >
            {items.map((item) => (
              <ComboboxOption
                className="px-3 py-2 ui-active:bg-green-200 dark:ui-active:green-400 dark:ui-active:text-gray-900"
                key={item.value}
                value={item.value}
              >
                {({ selected }) => (
                  <>
                    <span className="inline-block w-6">
                      {selected && <Icon icon="check" />}
                    </span>
                    {item.label}
                  </>
                )}
              </ComboboxOption>
            ))}
          </ComboboxOptions>
        </Combobox>
      </div>
    );
  },
);
MultiselectInput.displayName = "MultiselectInput";
export default MultiselectInput;
