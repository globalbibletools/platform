import * as z from "zod";
import ProcessEmailRejection from "../use-cases/ProcessEmailRejection";
import userRepository from "../data-access/UserRepository";
import { EmailStatusRaw } from "../model/EmailStatus";
import { logger } from "@/logging";

const messageSchema = z.discriminatedUnion("notificationType", [
  z.object({
    notificationType: z.literal("Bounce"),
    bounce: z.object({
      bounceType: z.enum(["Undetermined", "Permanent", "Transient"]),
      bouncedRecipients: z.array(z.object({ emailAddress: z.string() })),
    }),
  }),
  z.object({
    notificationType: z.literal("Complaint"),
    complaint: z.object({
      complainedRecipients: z.array(z.object({ emailAddress: z.string() })),
    }),
  }),
  z.object({
    notificationType: z.literal("Delivery"),
    delivery: z.object({}),
  }),
]);

const bodySchema = z.discriminatedUnion("Type", [
  z.object({
    Type: z.literal("SubscriptionConfirmation"),
    SubscribeURL: z.string(),
    Token: z.string(),
    TopicArn: z.string(),
  }),
  z.object({
    Type: z.literal("Notification"),
    Message: z.string(),
    TopicArn: z.string(),
  }),
]);

const processEmailRejectionUseCase = new ProcessEmailRejection(userRepository);

export default async function postEmailNotification(req: Request) {
  const childLogger = logger.child({
    route: "post email notification",
  });

  let body;
  try {
    body = bodySchema.parse(await req.json());
  } catch (error) {
    childLogger.error(error);
    return Response.json({ error: "Failed to parse body" }, { status: 400 });
  }

  switch (body.Type) {
    case "Notification": {
      const parseResult = messageSchema.safeParse(JSON.parse(body.Message));
      if (!parseResult.success) {
        childLogger.error(parseResult.error);
        return Response.json(
          { error: "Failed to parse message" },
          { status: 400 },
        );
      }

      const message = parseResult.data;
      switch (message.notificationType) {
        case "Bounce": {
          if (message.bounce.bounceType !== "Permanent") break;

          childLogger.info(
            {
              emails: message.bounce.bouncedRecipients.map(
                (r) => r.emailAddress,
              ),
            },
            "Emails bounced",
          );
          for (const recipient of message.bounce.bouncedRecipients) {
            await processEmailRejectionUseCase.execute({
              email: recipient.emailAddress,
              reason: EmailStatusRaw.Bounced,
            });
          }

          break;
        }
        case "Complaint": {
          childLogger.info(
            {
              emails: message.complaint.complainedRecipients.map(
                (r) => r.emailAddress,
              ),
            },
            "Email complaints",
          );

          for (const recipient of message.complaint.complainedRecipients) {
            try {
              await processEmailRejectionUseCase.execute({
                email: recipient.emailAddress,
                reason: EmailStatusRaw.Complained,
              });
            } catch (error) {
              childLogger.error({
                reason: EmailStatusRaw.Complained,
                email: recipient.emailAddress,
                err: error,
              });
            }
          }

          break;
        }
      }
      break;
    }
    case "SubscriptionConfirmation": {
      childLogger.info("SNS confirmation", { subscribeURL: body.SubscribeURL });
      break;
    }
  }

  return new Response(null, { status: 200 });
}
