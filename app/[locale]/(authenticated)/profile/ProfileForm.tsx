"use client";

import Form, { FormState } from "@/app/components/Form";
import { ReactNode, useRef } from "react";
import updateProfile from "./actions";

export default function ProfileForm({ children }: { children: ReactNode }) {
  "use client";
  const formContainerRef = useRef<HTMLDivElement>(null);
  return (
    <div ref={formContainerRef}>
      <Form
        action={async (
          _prevState: FormState,
          data: FormData
        ): Promise<FormState> => {
          const formSubmissionState = await updateProfile(_prevState, data);
          if (formSubmissionState.state === "error") {
            return formSubmissionState;
          }

          const passwordInput: any =
            formContainerRef.current?.querySelector("#password");
          if (passwordInput) passwordInput.value = "";
          const confirmPasswordInput: any =
            formContainerRef.current?.querySelector("#confirm-password");
          if (confirmPasswordInput) confirmPasswordInput.value = "";

          return formSubmissionState;
        }}
      >
        {children}
      </Form>
    </div>
  );
}
