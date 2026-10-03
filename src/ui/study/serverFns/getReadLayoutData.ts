import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";
import { verifySession } from "@/session";
import { getReadLanguagesReadModel } from "../readModels/getReadLanguagesReadModel";
import { getReadBookProgressReadModel } from "../readModels/getReadBookProgressReadModel";

const requestSchema = z.object({
  code: z.string(),
});

export const getReadLayoutData = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => requestSchema.parse(input))
  .handler(async ({ data }) => {
    const session = await verifySession();
    const [languages, progressByBookId] = await Promise.all([
      getReadLanguagesReadModel(session?.user.id),
      getReadBookProgressReadModel(data.code),
    ]);

    return { languages, progressByBookId };
  });
