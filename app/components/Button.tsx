import Link, { LinkProps as NextLinkProps } from 'next/link';
import { ComponentProps, forwardRef } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'tertiary';

interface _LinkProps extends NextLinkProps {
  className?: string;
  variant?: ButtonVariant;
  destructive?: boolean;
  small?: boolean;
}
interface _ButtonProps extends ComponentProps<'button'> {
  className?: string;
  variant?: ButtonVariant;
  destructive?: boolean;
  small?: boolean;
}

export type ButtonProps = _LinkProps | _ButtonProps;

const sharedClasses =
  'inline-flex justify-center items-center rounded-lg font-bold outline-2 disabled:opacity-50 focus-visible:outline';

function buttonClasses(
  variant: ButtonVariant,
  destructive: boolean,
  small: boolean
): string {
  const sizeClasses = small ? 'h-6 px-2' : 'h-9 px-3';

  switch (variant) {
    case 'primary': {
      return `${sharedClasses} ${sizeClasses} ${
        destructive
          ? 'bg-red-800 dark:bg-red-700 outline-red-300'
          : 'bg-blue-800 dark:bg-green-400 dark:text-gray-800 outline-green-300'
      } text-white shadow-md`;
    }
    case 'secondary': {
      return `${sharedClasses} ${sizeClasses} ${
        destructive
          ? 'text-red-800 dark:text-red-700 border-red-800 outline-red-300'
          : 'text-blue-800 dark:text-green-400 border-blue-800 dark:border-green-800 outline-green-300'
      } border-2 bg-white shadow-md`;
    }
    case 'tertiary': {
      return `${sharedClasses} ${small ? 'h-6' : 'h-9'} ${
        destructive
          ? 'text-red-800 dark:text-red-700 outline-red-300'
          : 'text-blue-800 dark:text-green-400 outline-green-300'
      }`;
    }
  }
}

function isLinkProps(props: ButtonProps): props is _LinkProps {
    return 'to' in props
}

function isButtonProps(props: ButtonProps): props is _ButtonProps {
    return !('to' in props)
}

const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  (
    {
      className = '',
      variant = 'primary',
      destructive = false,
      small = false,
      ...props
    },
    ref
  ) => {
    if (isLinkProps(props)) {
      return (
        <Link
          ref={ref as any}
          className={`${buttonClasses(
            variant,
            destructive,
            small
          )} ${className}`}
          {...props}
        />
      );
    } else if (isButtonProps(props)) {
      return (
        <button
          ref={ref as any}
          className={`${buttonClasses(
            variant,
            destructive,
            small
          )} ${className}`}
          type="button"
          {...props}
        />
      );
    } else {
        return null
    }
  }
);
Button.displayName = 'Button';
export default Button;

