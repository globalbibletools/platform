"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { Transition } from "@headlessui/react";
import { Icon } from "@/components/Icon";
import { useTranslations } from "next-intl";

// Flash messages have several states that help make their lifecycle easier to manage:
// unshown - This message has been added, but not yet displayed.
//           A message in this state will animate into view.
// shown - This message has been added and displayed
//         A message in this state will not reanimate if a message on top of it is dismissed.
// dismissed - This message has been dismissed either by the user or by a timeout.
//             A message in this state will animate out of view, and then be removed from the list.

type FlashMessageType = "error" | "success";
interface FlashMessage {
  id: string;
  message: string;
  level: FlashMessageType;
  state: "unshown" | "shown" | "dismissed";
  timeout?: number;
  timeoutId?: ReturnType<typeof setTimeout>;
}

interface FlashContextValue {
  /**
   * Display an error message to the user.
   * @param message The message to display.
   */
  error(message: string): void;
  /**
   * Display a success message to the user.
   * @param message Display a success message to the user.
   * @param timeout How long the message should remain visible. Defaults to three seconds.
   */
  success(message: string, timeout?: number): void;
  /** Clear all displayed messages.  */
  clear(): void;
}
const FlashContext = createContext<FlashContextValue | null>(null);

export interface FlashProviderProps {
  children: ReactNode;
}

function generateId() {
  return Math.floor(Math.random() * 100_000_000).toString();
}

export function FlashProvider({ children }: FlashProviderProps) {
  const [messages, setMessages] = useState<FlashMessage[]>([]);

  // These helper functions all have useCallback so that `useFlash` never triggers a render of components that use it.
  const error = useCallback((message: string) => {
    setMessages((messages) => [
      { id: generateId(), message, level: "error", state: "unshown" },
      ...messages,
    ]);
  }, []);
  const remove = useCallback((id: string) => {
    setMessages((messages) =>
      messages.map((message) =>
        message.id === id ? { ...message, state: "dismissed" } : message,
      ),
    );
  }, []);
  const success = useCallback(
    (message: string, timeout = 3000) => {
      const id = generateId();
      setMessages((messages) => [
        {
          id,
          message,
          level: "success",
          state: "unshown",
          timeout,
          timeoutId: setTimeout(() => {
            remove(id);
          }, timeout),
        },
        ...messages,
      ]);
    },
    [remove],
  );
  const clear = useCallback(() => {
    setMessages([]);
  }, []);

  // We memoize the context value so that `useFlash` never triggers a rerender in components that use it.
  const contextValue = useMemo(
    () => ({ error, success, clear }),
    [error, success, clear],
  );

  const t = useTranslations("Flash");

  return (
    <FlashContext.Provider value={contextValue}>
      {children}
      <div className="fixed top-0 w-full flex justify-center items-start z-10 pointer-events-none">
        {messages.slice(0, 1).map((message) => {
          return (
            <Transition
              key={message.id}
              appear={message.state === "unshown"}
              show={message.state !== "dismissed"}
              className={`
                mt-2 rounded shadow border font-bold flex items-stretch bg-white
                pointer-events-auto
                dark:bg-gray-900
                ${
                  message.level === "success" ?
                    "border-green-600"
                  : "border-red-600"
                }
              `}
              enter="transition-opacity transition-transform duration-300"
              enterFrom="opacity-0 -translate-y-4"
              enterTo="opacity-100 translate-y-0"
              leave="transition-opacity duration-75"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
              afterEnter={() => {
                setMessages((messages) =>
                  messages.map((m, i) => ({
                    ...m,
                    state: "shown",
                  })),
                );
              }}
              afterLeave={() =>
                setMessages((messages) =>
                  messages.filter((m) => m.id !== message.id),
                )
              }
            >
              <div
                className={`
                w-9
                ${message.level === "success" ? "bg-green-600" : "bg-red-600"}
              `}
              >
                <div className="flex justify-center items-center py-2 h-10">
                  <Icon
                    icon={
                      message.level === "success" ?
                        "check"
                      : "exclamation-triangle"
                    }
                    size="lg"
                    className=" text-white"
                  />
                </div>
              </div>
              <div role="alert" className="py-2 px-3">
                <span className="sr-only">
                  {message.level === "error" ? t("error") : t("success")}:
                </span>
                {message.message}
              </div>
              <button
                type="button"
                className="w-10 h-10 rounded focus:outline focus:outline-2 focus:outline-blue-600"
                onClick={() => remove(message.id)}
              >
                <Icon icon="close" />
                <span className="sr-only">{t("close")}</span>
              </button>
            </Transition>
          );
        })}
      </div>
    </FlashContext.Provider>
  );
}

/**
 * Enables the ability to send flash messages from any component.
 *
 * Use `flash.success('message')` or `flash.error('message') to show a message with the appropriate styling.
 * Success messages will clear themselves after a few seconds,
 * while error messages must be dismissed by the user.
 */
export function useFlash() {
  const context = useContext(FlashContext);
  if (!context) {
    throw new Error("useFlash should be used within FlashContext component.");
  }
  return context;
}
