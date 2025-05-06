import { expect, test } from "vitest";
import { findUsers, initializeDatabase } from "@/tests/vitest/dbUtils";
import postEmailNotification from "./emailNotifications";
import { EmailStatusRaw } from "../model/EmailStatus";
import { userFactory } from "../test-utils/factories";

initializeDatabase();

test("returns error if body has invalid data", async () => {
  const response = await postEmailNotification({
    async json() {
      return {};
    },
  } as Request);
  expect(response).toMatchObject({
    status: 400,
  });
});

test("returns error if notification message is invalid", async () => {
  const response = await postEmailNotification({
    async json() {
      return {
        Type: "Notification",
        Message: JSON.stringify({}),
        TopicArn: "test-arn",
      };
    },
  } as Request);
  expect(response).toMatchObject({
    status: 400,
  });
});

test("handles permanent bounce rejections", async () => {
  const user = await userFactory.build({
    email: "test@example.com",
    emailStatus: EmailStatusRaw.Verified,
  });

  const response = await postEmailNotification({
    async json() {
      return {
        Type: "Notification",
        Message: JSON.stringify({
          notificationType: "Bounce",
          bounce: {
            bounceType: "Permanent",
            bouncedRecipients: [{ emailAddress: "test@example.com" }],
          },
        }),
        TopicArn: "test-arn",
      };
    },
  } as Request);

  expect(response).toMatchObject({
    status: 200,
  });

  const dbUsers = await findUsers();
  expect(dbUsers).toEqual([
    {
      ...user,
      emailStatus: EmailStatusRaw.Bounced,
    },
  ]);
});

test("ignores non-permanent bounce rejections", async () => {
  const user = await userFactory.build({
    email: "test@example.com",
    emailStatus: EmailStatusRaw.Verified,
  });

  const response = await postEmailNotification({
    async json() {
      return {
        Type: "Notification",
        Message: JSON.stringify({
          notificationType: "Bounce",
          bounce: {
            bounceType: "Transient",
            bouncedRecipients: [{ emailAddress: "test@example.com" }],
          },
        }),
        TopicArn: "test-arn",
      };
    },
  } as Request);

  expect(response).toMatchObject({
    status: 200,
  });

  const dbUsers = await findUsers();
  expect(dbUsers).toEqual([user]);
});

test("handles complaint rejections", async () => {
  const user = await userFactory.build({
    email: "test@example.com",
    emailStatus: EmailStatusRaw.Verified,
  });

  const response = await postEmailNotification({
    async json() {
      return {
        Type: "Notification",
        Message: JSON.stringify({
          notificationType: "Complaint",
          complaint: {
            complainedRecipients: [{ emailAddress: "test@example.com" }],
          },
        }),
        TopicArn: "test-arn",
      };
    },
  } as Request);

  expect(response).toMatchObject({
    status: 200,
  });

  const dbUsers = await findUsers();
  expect(dbUsers).toEqual([
    {
      ...user,
      emailStatus: EmailStatusRaw.Complained,
    },
  ]);
});

test("logs sns subscription url", async () => {
  const response = await postEmailNotification({
    async json() {
      return {
        Type: "SubscriptionConfirmation",
        SubscribeURL: "https://example.com/subscribe",
        Token: "token-asdf",
        TopicArn: "test-arn",
      };
    },
  } as Request);

  expect(response).toMatchObject({
    status: 200,
  });
});
