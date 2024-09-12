"use client";

import { ChangeEvent, ComponentProps, forwardRef, useMemo } from 'react';
import debounce from './debounce';
import { useFormContext } from './Form';

export interface TextInputProps extends ComponentProps<'input'> {
    autosubmit?: boolean
};

const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ className = '', autosubmit = false, onChange, ...props }, ref) => {
    const formContext = useFormContext()
    const hasErrors = formContext?.state === 'error' && (formContext.validation?.[props.name ?? '']?.length ?? 0) > 0

    const autosubmitForm = useMemo(() => autosubmit ? debounce((e: ChangeEvent<HTMLInputElement>) => {
        e.target.form?.requestSubmit()
    }, 1000) : undefined, [autosubmit])

    return (
      <input
        ref={ref}
        className={`
          border rounded shadow-inner px-3 h-9 bg-white
          focus-visible:outline outline-2
          dark:bg-gray-800 dark:shadow-none
          ${
            hasErrors
              ? 'border-red-700 shadow-red-100 outline-red-700'
              : 'border-gray-400 outline-green-300 dark:border-gray-500'
          }
          ${className}
        `}
        onChange={e => {
            autosubmitForm?.(e)
            onChange?.(e)
        }}
        {...props}
      />
    );
  }
);
TextInput.displayName = 'TextInput';
export default TextInput;

