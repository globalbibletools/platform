"use client";

import { Combobox } from "@headlessui/react";
import {
  ComponentProps,
  KeyboardEventHandler,
  forwardRef,
  useEffect,
  useRef,
  useState,
} from "react";
import { Icon } from "./Icon";
import { useFormContext } from "./Form";

export interface ComboboxItem {
  label: string;
  value: string;
}

interface BaseComboboxInputProps
  extends Omit<ComponentProps<"input">, "value" | "onChange" | "ref"> {
  className?: string;
  name?: string;
  items: ComboboxItem[];
  value?: string;
  defaultValue?: string;
  up?: boolean;
  autosubmit?: boolean;
  onBlur?(): void;
  onChange?(value: string): void;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
}

const ComboboxInput = forwardRef<HTMLInputElement, BaseComboboxInputProps>(
  (
    {
      className = "",
      value,
      defaultValue,
      onChange,
      onBlur,
      items,
      name,
      up,
      onKeyDown,
      disabled,
      autosubmit = false,
      ...props
    }: BaseComboboxInputProps,
    ref,
  ) => {
    const [normalizedInputValue, setNormalizedInputValue] = useState("");
    const [filteredItems, setFilteredItems] = useState<ComboboxItem[]>(items);

    const formContext = useFormContext();
    const hasErrors =
      formContext?.state === "error" &&
      (formContext.validation?.[name ?? ""]?.length ?? 0) > 0;

    // If none of the items matches the input value exactly,
    // then we want to give the option of creating a new item.
    useEffect(() => {
      if (normalizedInputValue) {
        const filteredItems = items.filter((item) =>
          ignoreDiacritics(item.label.normalize("NFD").toLowerCase()).includes(
            ignoreDiacritics(normalizedInputValue.toLowerCase()),
          ),
        );
        setFilteredItems(filteredItems);
      } else {
        setFilteredItems(items);
      }
    }, [items, normalizedInputValue]);

    const root = useRef<HTMLDivElement>(null);

    return (
      <div
        ref={root}
        className={`${className} relative ${disabled ? "opacity-25" : ""}`}
      >
        <Combobox
          value={value}
          defaultValue={defaultValue}
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
          name={name}
          disabled={disabled}
        >
          <div
            className={`
              h-9 border rounded shadow-inner flex outline-2 has-[:focus-visible]:outline bg-white
              dark:shadow-none dark:bg-gray-800
              ${
                hasErrors ?
                  "border-red-700 shadow-red-100 outline-red-700"
                : "border-gray-400 outline-green-300 dark:border-gray-500"
              }
          `}
          >
            <Combobox.Input
              {...props}
              onChange={(event) =>
                setNormalizedInputValue(event.target.value.normalize("NFD"))
              }
              onBlur={onBlur}
              className="w-full px-3 h-full rounded-b flex-grow focus:outline-none bg-transparent rounded"
              displayValue={(value) =>
                items.find((i) => i.value === value)?.label ?? ""
              }
              onKeyDown={(e) => {
                if (onKeyDown) {
                  onKeyDown(e);
                }
              }}
              ref={ref}
            />
            <Combobox.Button className="w-8">
              {({ open }) => <Icon icon={open ? "caret-up" : "caret-down"} />}
            </Combobox.Button>
          </div>
          <Combobox.Options
            className={`
              z-10 absolute w-full max-h-80 bg-white overflow-auto mt-1 rounded border border-gray-400 shadow
              dark:bg-gray-700 dark:border-gray-600
              ${up ? "-mt-1 top-0 transform -translate-y-full" : "mt-1"}
            `}
          >
            {filteredItems.map((item) => (
              <Combobox.Option
                className="px-3 py-2 ui-active:bg-green-200 dark:ui-active:green-400 dark:ui-active:text-gray-800"
                key={item.value}
                value={item.value}
              >
                {item.label}
              </Combobox.Option>
            ))}
          </Combobox.Options>
        </Combobox>
      </div>
    );
  },
);
ComboboxInput.displayName = "ComboboxInput";
export default ComboboxInput;

/**
 * Return a version of the word where all diacritics have been removed.
 */
function ignoreDiacritics(word: string) {
  // From https://stackoverflow.com/a/37511463
  return word.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}
