import { ComponentProps, forwardRef } from 'react';
// import { useFormContext } from 'react-hook-form';

export type TextInputProps = ComponentProps<'input'>;

const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ className = '', ...props }, ref) => {
    // const context = useFormContext();
    // const hasErrors = !!(props.name && context?.formState.errors[props.name]);
    const hasErrors = false

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
        {...props}
      />
    );
  }
);
TextInput.displayName = 'TextInput';
export default TextInput;

