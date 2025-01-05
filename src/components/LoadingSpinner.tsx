export interface LoadingSpinnerProps {
  dark?: boolean;
  className?: string;
}

export default function LoadingSpinner({
  dark = false,
  className = ''
}: LoadingSpinnerProps) {
  return (
      <div
        className={`${className} h-6 flex space-x-1 justify-center items-center`}
        aria-hidden="true"
      >
            <div className='h-2 w-2 bg-current rounded-full animate-bounce [animation-delay:-0.3s]'></div>
            <div className='h-2 w-2 bg-current rounded-full animate-bounce [animation-delay:-0.15s]'></div>
            <div className='h-2 w-2 bg-current rounded-full animate-bounce'></div>
        </div>
  );
}
 
