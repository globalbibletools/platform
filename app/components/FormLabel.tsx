import { ComponentProps, forwardRef } from 'react';

const FormLabel = forwardRef<HTMLLabelElement, ComponentProps<'label'>>(
  ({ className = '', ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={`
          font-bold text-sm
          ${className}
        `}
        {...props}
      />
    );
  }
);
FormLabel.displayName = 'FormLabel';
export default FormLabel;

