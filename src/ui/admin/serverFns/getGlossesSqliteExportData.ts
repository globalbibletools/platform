import { sql } from "kysely";
import { createPolicyMiddleware, Policy } from "@/modules/access";
import { getDb } from "@/db";
import { createServerFn } from "@tanstack/react-start";
import { getAllLanguagesReadModel } from "@/ui/admin/readModels/getAllLanguagesReadModel";

const policy = new Policy({
  systemRoles: [Policy.SystemRole.Admin],
});

export interface GlossesSqliteExportJob {
  id: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  languageCodes: string[];
}

export const getGlossesSqliteExportData = createServerFn()
  .middleware([
    createPolicyMiddleware({
      policy,
    }),
  ])
  .handler(async () => {
    const [latestJob, languages] = await Promise.all([
      getLatestGlossesSqliteExportJob(),
      getAllLanguagesReadModel(),
    ]);

    return { latestJob, languages };
  });

async function getLatestGlossesSqliteExportJob(): Promise<
  GlossesSqliteExportJob | undefined
> {
  const row = await getDb()
    .selectFrom("job")
    .where("type", "=", "export_glosses_sqlite")
    .orderBy("created_at", "desc")
    .select([
      "id",
      "status",
      "created_at as createdAt",
      "updated_at as updatedAt",
      (eb) =>
        sql<string[]>`${eb.ref("job.payload")}->'languageCodes'`.as(
          "languageCodes",
        ),
    ])
    .limit(1)
    .executeTakeFirst();

  return row;
}
