import Button, { ActionProps } from "./Button";
import { useRef } from "react";
import { useFlash } from "../flash";
import ConfirmModal, { ConfirmModalRef } from "./ConfirmModal";
import { OptionalFetcher, useServerFn } from "@tanstack/react-start";
import { useRouter } from "@tanstack/react-router";

export interface ServerActionProps extends ActionProps {
  // At some point, we can allow action data to take nested objects and arrays if we need to.
  actionData?: Record<
    string,
    string | number | boolean | Record<string, string | number | boolean>
  >;
  action: OptionalFetcher<any, any, any>;
  confirm?: string | boolean;
  successMessage?: string;
  invalidate?: boolean;
  onComplete?(): void;
}

export default function ServerAction({
  action,
  actionData,
  confirm = false,
  successMessage,
  invalidate,
  onComplete,
  ...props
}: ServerActionProps) {
  const serverFn = useServerFn(action);
  const flash = useFlash();
  const router = useRouter();
  const confirmModalRef = useRef<ConfirmModalRef>(null);

  function onModalClose() {
    const result = confirmModalRef.current?.returnValue;

    if (result === "yes") {
      submit();
    }
  }

  async function submit() {
    try {
      await serverFn({ data: actionData });

      if (invalidate) {
        router.invalidate();
      }

      if (successMessage) {
        flash.success(successMessage);
      }

      onComplete?.();
    } catch (error) {
      flash.error(error instanceof Error ? error.message : "Failed request");
    }
  }

  return (
    <>
      <Button
        {...props}
        onClick={() => {
          if (confirm) {
            confirmModalRef.current?.showModal();
            return;
          }

          submit();
        }}
      />
      {confirm && (
        <ConfirmModal
          ref={confirmModalRef}
          prompt={typeof confirm === "string" ? confirm : ""}
          onClose={onModalClose}
        />
      )}
    </>
  );
}
