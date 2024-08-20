export interface FieldErrorProps {
  id?: string;
  errors?: string[]
}

export default function FieldError({ id, errors }: FieldErrorProps) {

  if (errors?.[0]) {
    return (
      <div id={id} className="text-red-700 text-sm">
        {errors[0]}
      </div>
    );
  } else {
    return null;
  }
}

