import * as z from 'zod';
import { query } from '@/db';

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

export async function POST(req: Request) {
    const rawbody = await req.json()
    console.log('Email notification', rawbody)
    const bodyResult = bodySchema.safeParse(rawbody)
    if (!bodyResult.success) {
        return Response.json({ error: 'Failed to parse body' }, { status: 400 })
    }
    const body = bodyResult.data

      switch (body.Type) {
        case 'Notification': {
          const parseResult = messageSchema.safeParse(
            JSON.parse(body.Message)
          );
          if (!parseResult.success) {
              return Response.json({ error: 'Failed to parse message' }, { status: 400 })
          }

          const message = parseResult.data;
          switch (message.notificationType) {
            case 'Bounce': {
              if (message.bounce.bounceType !== 'Permanent') break 

              const emails = message.bounce.bouncedRecipients.map(r => r.emailAddress.toLowerCase())
              console.log(`Email bounced: ${emails.join(', ')}`)
              await query(`UPDATE users SET email_status = 'BOUNCED' WHERE email = ANY($1::text[])`, [emails])

              break;
            }
            case 'Complaint': {
              const emails = message.complaint.complainedRecipients.map(r => r.emailAddress.toLowerCase())
              console.log(`Email complaint: ${emails.join(', ')}`);
              await query(`UPDATE "User" SET email_status = 'COMPLAINED' WHERE email = ANY($1::text[])`, [emails])

              break;
            }
          }
          break;
        }
        case 'SubscriptionConfirmation': {
          console.log('SNS Confirmation', body.SubscribeURL);
          break;
        }
      }

      return new Response(null, { status: 200 })
}

