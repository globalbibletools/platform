import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";
import { getReadLanguagesReadModel } from "../readModels/getReadLanguagesReadModel";
import { getReadBookProgressReadModel } from "../readModels/getReadBookProgressReadModel";

const requestSchema = z.object({
  code: z.string(),
});

export const getReadLayoutData = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => requestSchema.parse(input))
  .handler(async ({ data }) => {
    const languages = await getReadLanguagesReadModel();
    const progressByBookId = await getReadBookProgressReadModel(data.code);

    return { languages, progressByBookId };
  });
