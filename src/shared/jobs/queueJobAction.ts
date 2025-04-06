"use server";

import * as z from "zod";
import { FormState } from "@/components/Form";
import { parseForm } from "@/form-parser";
import { serverActionLogger } from "@/server-action";
import { enqueueJob } from "./enqueueJob";

const queueJobSchema = z.object({
  type: z.string(),
  payload: z.any().optional(),
});

export async function queueJobAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const logger = serverActionLogger("queueJobAction");

  const request = queueJobSchema.safeParse(parseForm(formData));
  if (!request.success) {
    logger.error("request parse error");
    return {
      state: "error",
      validation: request.error.flatten().fieldErrors,
    };
  }

  try {
    await enqueueJob(request.data.type, request.data.payload);
  } catch (error) {
    logger.error(error);
    return { state: "error", error: String(error) };
  }

  return { state: "success" };
}
