import * as z from 'zod';
import Button from "@/app/components/Button";
import FormLabel from "@/app/components/FormLabel";
import ModalView, { ModalViewTitle } from "@/app/components/ModalView";
import TextInput from "@/app/components/TextInput";
import { Scrypt } from "oslo/password";
import { createSession } from '@/app/session';
import { redirect } from 'next/navigation';
import { query } from '@/app/db';

const scrypt = new Scrypt()

const loginSchema = z.object({
    email: z.string(),
    password: z.string()
})

async function login(formData: FormData) {
    "use server";
    const request = loginSchema.parse({
        email: formData.get('email'),
        password: formData.get('password')
    });

    const result = await query<{ id: string, hashedPassword: string }>(`SELECT id, "hashedPassword" FROM "User" WHERE email = $1`, [request.email.toLowerCase()])
    const user = result.rows[0];
    const valid = await scrypt.verify(user.hashedPassword, request.password)
    if (!valid) {
        return;
    }

    await createSession(user.id)
    redirect('/')
}

export default function LoginPage() {
    return <ModalView className="max-w-[480px] w-full">
        <ModalViewTitle>Log In</ModalViewTitle>
        <form className="max-w-[300px] w-full mx-auto" action={login}>
        <div className="mb-4">
          <FormLabel htmlFor="email">Email</FormLabel>
          <TextInput
            id="email"
            name="email"
            className="w-full"
            autoComplete="username"
            aria-describedby="email-error"
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
        </div>
        <Button type="submit" className="w-full mb-2">Log In</Button>
        <div className="text-center">
          <Button variant="tertiary" href="/forgot-password">
            Forgot Password?
          </Button>
        </div>
      </form>
    </ModalView>
}
