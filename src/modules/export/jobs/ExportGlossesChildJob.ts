import { createJobModel } from "@/shared/jobs/model";
import * as z from "zod";

const ExportLanguageBlobsPayloadSchema = z.object({
  languageCodes: z.array(z.string()),
});

const ExportLanguageBlobsDataSchema = z.object({
  treeItems: z.array(
    z.object({
      path: z.string(),
      mode: z.enum(["100644", "100755", "040000", "160000", "120000"]),
      type: z.enum(["blob", "tree", "commit"]),
      sha: z.string(),
    }),
  ),
});

export class ExportGlossesChildJob extends createJobModel({
  type: "export_glosses_child",
  payloadSchema: ExportLanguageBlobsPayloadSchema,
  dataSchema: ExportLanguageBlobsDataSchema,
}) {}
