import { type SQSEvent } from "aws-lambda";

export async function handler(event: SQSEvent) {
  console.log(event);
  return 200;
}
