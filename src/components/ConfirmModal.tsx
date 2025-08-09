"use client";

import { useTranslations } from "next-intl";
import { ComponentProps, forwardRef, MouseEvent } from "react";
import Button from "./Button";
import { Icon } from "./Icon";

export interface ConfirmModalProps extends ComponentProps<"dialog"> {
  prompt: string;
}

export type ConfirmModalRef = HTMLDialogElement;

const ConfirmModal = forwardRef<ConfirmModalRef, ConfirmModalProps>(
  ({ prompt, ...props }: ConfirmModalProps, ref) => {
    const t = useTranslations("ConfirmModal");

    return (
      <dialog
        ref={ref}
        {...props}
        className="
          relative max-w-[400px]
          rounded-lg shadow-md border border-gray-200 bg-white mx-auto p-8 focus-visible:outline outline-green-300 outline-2
          dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200
        "
      >
        <button
          type="button"
          className="absolute text-red-700 top-1 end-1 w-8 h-8 outline-green-300 outline-2 rounded"
          onClick={(e) => {
            e.currentTarget.closest("dialog")?.close();
          }}
        >
          <Icon icon="close" />
          <span className="sr-only">{t("close")}</span>
        </button>
        <h1 className="font-bold text-lg mb-2">
          <Icon icon="triangle-exclamation" className="text-red-700 me-2" />
          {t("title")}
        </h1>
        <p>{prompt}</p>
        <div className="mt-4 flex justify-end gap-2 items-center">
          <Button
            variant="secondary"
            onClick={(e: MouseEvent) =>
              e.currentTarget.closest("dialog")?.close("no")
            }
          >
            {t("no")}
          </Button>
          <Button
            onClick={(e: MouseEvent) =>
              e.currentTarget.closest("dialog")?.close("yes")
            }
          >
            {t("yes")}
          </Button>
        </div>
      </dialog>
    );
  },
);
ConfirmModal.displayName = "ConfirmModal";

export default ConfirmModal;
