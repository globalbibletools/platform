import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";
import { getReadLanguagesReadModel } from "../readModels/getReadLanguagesReadModel";

const requestSchema = z.object({
  code: z.string(),
});

export const getReadLayoutData = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => requestSchema.parse(input))
  .handler(async () => {
    const languages = await getReadLanguagesReadModel();

    return { languages };
  });
