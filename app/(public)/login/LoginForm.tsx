"use client";

import Button from "@/app/components/Button";
import FormLabel from "@/app/components/FormLabel";
import TextInput from "@/app/components/TextInput";
import { login } from "./actions";
import { useFormState } from "react-dom";
import FieldError from "@/app/components/FieldError";

export default function LoginForm() {

    const [state, formAction] = useFormState(login, {})

    return <form className="max-w-[300px] w-full mx-auto" action={formAction}>
        <div className="mb-4">
            <FormLabel htmlFor="email">Email</FormLabel>
            <TextInput
                id="email"
                name="email"
                className="w-full"
                autoComplete="username"
                aria-describedby="email-error"
            />
            <FieldError
                id="email-error"
                errors={state.errors?.email}
            />
        </div>
        <div className="mb-6">
            <FormLabel htmlFor="password">Password</FormLabel>
            <TextInput
                id="password"
                type="password"
                name="password"
                className="w-full"
                autoComplete="current-password"
                aria-describedby="password-error"
            />
            <FieldError
                id="password-error"
                errors={state.errors?.email}
            />
        </div>
        <Button type="submit" className="w-full mb-2">Log In</Button>
        <div className="text-center">
            <Button variant="tertiary" href="/forgot-password">
                Forgot Password?
            </Button>
        </div>
    </form>
}
