import { ComponentProps, Ref } from "react";

interface FormLabelProps extends ComponentProps<"label"> {
  ref?: Ref<HTMLLabelElement>;
}

export default function FormLabel({
  ref,
  className = "",
  ...props
}: FormLabelProps) {
  return (
    <label
      ref={ref}
      className={`
        font-bold text-sm uppercase
        ${className}
      `}
      {...props}
    />
  );
}
