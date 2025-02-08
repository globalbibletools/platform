import { EmailOptions } from "@/mailer";
import { vi } from "vitest";

vi.mock("@/mailer", () => {
  return {
    default: {
      sendEmail(args: EmailOptions) {
        return sendEmailMock(args);
      },
    },
  };
});

export const sendEmailMock = vi.fn<(options: EmailOptions) => Promise<void>>();
