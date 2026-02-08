"use client";

import Button, { ActionProps } from "./Button";
import { FormState } from "./Form";
import { useEffect, useRef, useActionState, startTransition } from "react";
import { useFlash } from "../flash";
import ConfirmModal, { ConfirmModalRef } from "./ConfirmModal";

export interface ServerActionProps extends ActionProps {
  // At some point, we can allow action data to take nested objects and arrays if we need to.
  actionData?: Record<string, string | number>;
  action: (
    state: Awaited<FormState>,
    formData: FormData,
  ) => FormState | Promise<FormState>;
  confirm?: string | boolean;
}

export default function ServerAction({
  action,
  actionData,
  confirm = false,
  ...props
}: ServerActionProps) {
  const [state, serverAction] = useActionState(action, { state: "idle" });
  const flash = useFlash();

  const confirmModal = useRef<ConfirmModalRef>(null);

  useEffect(() => {
    if (state.state === "error" && state.error) {
      flash.error(state.error);
    } else if (state.state === "success" && state.message) {
      flash.success(state.message);
    }
  }, [state, flash]);

  function onModalClose() {
    const result = confirmModal.current?.returnValue;

    if (result === "yes") {
      submit();
    }
  }

  function submit() {
    const form = new FormData();
    if (actionData) {
      for (const [key, value] of Object.entries(actionData)) {
        form.set(key, value.toString());
      }
    }

    startTransition(() => {
      serverAction(form);
    });
  }

  return (
    <>
      <Button
        {...props}
        onClick={() => {
          if (confirm) {
            confirmModal.current?.showModal();
            return;
          }

          submit();
        }}
      />
      {confirm && (
        <ConfirmModal
          ref={confirmModal}
          prompt={typeof confirm === "string" ? confirm : ""}
          onClose={onModalClose}
        />
      )}
    </>
  );
}
