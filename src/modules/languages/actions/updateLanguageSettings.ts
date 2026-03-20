import * as z from "zod";
import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { serverActionLogger } from "@/server-action";
import { updateLanguageSettings as updateLanguageSettingsUseCase } from "../use-cases/updateLanguageSettings";
import { MachineGlossStrategy, TextDirectionRaw } from "../model";
import { NotFoundError } from "@/shared/errors";
import { createPolicyMiddleware, Policy } from "@/modules/access";

const requestSchema = z.object({
  code: z.string(),
  localName: z.string().min(1),
  englishName: z.string().min(1),
  font: z.string().min(1),
  textDirection: z.nativeEnum(TextDirectionRaw),
  translationIds: z.array(z.string()).default([]),
  referenceLanguageId: z.string().optional(),
  machineGlossStrategy: z.nativeEnum(MachineGlossStrategy),
});

const policy = new Policy({
  systemRoles: [Policy.SystemRole.Admin],
  languageMember: true,
});

export const updateLanguageSettings = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    if (!(data instanceof FormData)) {
      throw new Error("expected FormData");
    }

    return requestSchema.parse({
      code: data.get("code"),
      englishName: data.get("englishName"),
      localName: data.get("localName"),
      font: data.get("font"),
      textDirection: data.get("text_direction"),
      translationIds: data
        .get("bible_translations")
        ?.toString()
        .split(",")
        .filter((id) => id !== ""),
      referenceLanguageId: data.get("reference_language_id") ?? undefined,
      machineGlossStrategy: data.get("machineGlossStrategy"),
    });
  })
  .middleware([
    createPolicyMiddleware({
      policy,
      languageCodeField: "code",
    }),
  ])
  .handler(async ({ data }) => {
    const logger = serverActionLogger("updateLanguageSettings");

    try {
      await updateLanguageSettingsUseCase(data);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw notFound();
      }

      throw error;
    }
  });
