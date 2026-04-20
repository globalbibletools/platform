import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";
import { getReadLemmaResourceReadModel } from "../readModels/getReadLemmaResourceReadModel";

const requestSchema = z.object({
  lemmaId: z.string(),
});

export const getReadLemmaResource = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => requestSchema.parse(input))
  .handler(async ({ data }) => {
    return await getReadLemmaResourceReadModel(data.lemmaId);
  });
