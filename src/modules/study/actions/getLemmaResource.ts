import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";
import readingQueryService from "../data-access/ReadingQueryService";

const requestSchema = z.object({
  lemmaId: z.string(),
});

export const getLemmaResource = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => requestSchema.parse(input))
  .handler(async ({ data }) => {
    return await readingQueryService.fetchResourceForLemmaId(data.lemmaId);
  });
