import * as z from 'zod';
import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/app/db';

const messageSchema = z.discriminatedUnion('notificationType', [
  z.object({
    notificationType: z.literal('Bounce'),
    bounce: z.object({
      bounceType: z.enum(['Undetermined', 'Permanent', 'Transient']),
      bouncedRecipients: z.array(z.object({ emailAddress: z.string() })),
    }),
  }),
  z.object({
    notificationType: z.literal('Complaint'),
    complaint: z.object({
      complainedRecipients: z.array(z.object({ emailAddress: z.string() })),
    }),
  }),
  z.object({
    notificationType: z.literal('Delivery'),
    delivery: z.object({}),
  }),
]);

const bodySchema = z.discriminatedUnion('Type', [
  z.object({
    Type: z.literal('SubscriptionConfirmation'),
    SubscribeURL: z.string(),
    Token: z.string(),
    TopicArn: z.string(),
  }),
  z.object({
    Type: z.literal('Notification'),
    Message: z.string(),
    TopicArn: z.string(),
  }),
])

export async function POST(req: NextApiRequest, res: NextApiResponse) {
    const bodyResult = bodySchema.safeParse(req.body)
    if (!bodyResult.success) {
        res.status(400).json({ error: 'Failed to parse body' })
        return
    }
    const body = bodyResult.data

      switch (body.Type) {
        case 'Notification': {
          const parseResult = messageSchema.safeParse(
            JSON.parse(body.Message)
          );
          if (!parseResult.success) {
              res.status(400).json({ error: 'Failed to parse message' })
              return
          }

          const message = parseResult.data;
          switch (message.notificationType) {
            case 'Bounce': {
              if (message.bounce.bounceType !== 'Permanent') break 

              const emails = message.bounce.bouncedRecipients.map(r => r.emailAddress.toLowerCase())
              console.log(`Email bounced: ${emails.join(', ')}`)
              await query(`UPDATE "User" SET "emailStatus" = 'BOUNCED' WHERE email = ANY($1::text[])`, [emails])

              break;
            }
            case 'Complaint': {
              const emails = message.complaint.complainedRecipients.map(r => r.emailAddress.toLowerCase())
              console.log(`Email complaint: ${emails.join(', ')}`);
              await query(`UPDATE "User" SET "emailStatus" = 'COMPLAINED' WHERE email = ANY($1::text[])`, [emails])

              break;
            }
          }
          break;
        }
        case 'SubscriptionConfirmation': {
          console.log('SNS Confirmation', req.body.SubscribeURL);
          break;
        }
      }

      res.status(200).end();
}

