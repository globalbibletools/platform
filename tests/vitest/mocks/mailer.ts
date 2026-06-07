import { EmailOptions } from "@/shared/email";
import { vi } from "vitest";

vi.mock("@/shared/email", () => {
  return {
    default: {
      sendEmail(args: EmailOptions) {
        return sendEmailMock(args);
      },
    },
  };
});

export const sendEmailMock = vi.fn<(options: EmailOptions) => Promise<void>>();
