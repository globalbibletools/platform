import { execSync } from "child_process";
import { TestProject } from "vitest/node";

export async function setup(project: TestProject) {
  console.log("setting up template database");

  execSync(
    `psql ${process.env.TEST_DATABASE_URL} -f ./db/scripts/test_template_db.sql`,
  );
}
