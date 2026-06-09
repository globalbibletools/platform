import { sql } from "kysely";
import { createPolicyMiddleware, Policy } from "@/modules/access";
import { getDb } from "@/db";
import { createServerFn } from "@tanstack/react-start";

const policy = new Policy({
  systemRoles: [Policy.SystemRole.Admin],
});

export const getActiveJobs = createServerFn()
  .middleware([
    createPolicyMiddleware({
      policy,
    }),
  ])
  .handler(async () => {
    const exportJobs = await getDb()
      .with("export_job", (db) =>
        db
          .selectFrom("job")
          .where("type", "=", "export_glosses")
          .orderBy("created_at", "desc")
          .select(["id"])
          .limit(1),
      )
      .selectFrom("job")
      .where((eb) =>
        eb.or([
          eb(
            "job.parent_job_id",
            "=",
            eb.selectFrom("export_job").select("id"),
          ),
          eb("job.id", "=", eb.selectFrom("export_job").select("id")),
        ]),
      )
      .orderBy("created_at")
      .select([
        "job.id",
        "job.type",
        "job.status",
        "job.updated_at as updatedAt",
        "job.created_at as createdAt",
        (eb) =>
          sql<Array<string>>`${eb.ref("job.payload")}->'languageCodes'`.as(
            "languages",
          ),
      ])
      .execute();

    return { exportJobs };
  });
