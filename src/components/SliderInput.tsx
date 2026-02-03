import { ComponentProps } from "react";

export default function SliderInput({
  className = "",
  ...props
}: ComponentProps<"input">) {
  return (
    <input
      {...props}
      type="range"
      className={`
        h-2 rounded-lg appearance-none cursor-pointer bg-gray-300
        slider-thumb:appearance-none slider-thumb:w-4 slider-thumb:h-4 slider-thumb:cursor-pointer slider-thumb:rounded-full slider-thumb:bg-blue-800 slider-thumb:-mt-1 slider-thumb:shadow
        slider-track:appearance-none slider-track:h-2 slider-track:rounded-full
        outline-none slider-thumb:focus-visible:outline slider-thumb:outline-green-300
        dark:bg-gray-700 dark:slider-thumb:bg-green-400 dark:slider-thumb:shadow-none
        ${className}
      `}
    />
  );
}
