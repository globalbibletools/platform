import { Project, SourceFile } from "ts-morph";
import * as path from "path";

// ─── Public types ────────────────────────────────────────────────────────────

export type Cardinality =
  | "many-to-one"
  | "one-to-many"
  | "one-to-one"
  | "many-to-many";

export interface RelationDoc {
  fromColumn: string;
  toTable: string;
  cardinality: Cardinality;
}

export interface ColumnDoc {
  name: string;
  /** Raw TypeScript type text as written in the source. */
  type: string;
  nullable: boolean;
  description: string;
  relation: RelationDoc | null;
}

export interface TableDoc {
  /** Original interface name, e.g. "GlossTable" */
  name: string;
  /** SQL-style name derived from the interface, e.g. "gloss" */
  tableName: string;
  kind: "table" | "view";
  description: string;
  columns: ColumnDoc[];
  /** All @relation tags collected from the columns, in column order. */
  relations: RelationDoc[];
}

export interface SchemaDoc {
  /** Module folder name, e.g. "bible-core" */
  moduleName: string;
  tables: TableDoc[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Derive a SQL table/view name from an interface name.
 * "GlossTable" → "gloss", "LanguageProgressView" → "language_progress"
 */
function toSqlName(interfaceName: string): string {
  const stripped = interfaceName.replace(/Table$|View$/, "");
  // CamelCase → snake_case
  return stripped
    .replace(/([A-Z])/g, (_, c, offset) => (offset > 0 ? "_" : "") + c)
    .toLowerCase();
}

// ─── Main parser ─────────────────────────────────────────────────────────────

/**
 * Parse a db/schema.ts file and return structured documentation for all
 * exported *Table and *View interfaces.
 *
 * @param schemaFilePath  Absolute path to the schema.ts file.
 * @param moduleName      Module folder name used in the output.
 */
export function parseSchema(
  schemaFilePath: string,
  moduleName: string,
): SchemaDoc {
  // Create a minimal ts-morph project – we don't need full type-checking,
  // just enough to read the AST and JSDoc comments.
  const project = new Project({
    compilerOptions: {
      skipLibCheck: true,
      noEmit: true,
    },
    skipFileDependencyResolution: true,
  });

  const sourceFile: SourceFile = project.addSourceFileAtPath(
    path.resolve(schemaFilePath),
  );

  const tables: TableDoc[] = [];

  for (const iface of sourceFile.getInterfaces()) {
    if (!iface.isExported()) continue;

    const ifaceName = iface.getName();
    const isTable = ifaceName.endsWith("Table");
    const isView = ifaceName.endsWith("View");
    if (!isTable && !isView) continue;

    // Interface-level description: join all JSDoc descriptions.
    const ifaceDescription = iface
      .getJsDocs()
      .map((d) => d.getDescription().trim())
      .join("\n")
      .trim();

    const tableName = toSqlName(ifaceName);
    const kind: "table" | "view" = isView ? "view" : "table";

    const columns: ColumnDoc[] = [];
    const relations: RelationDoc[] = [];

    for (const prop of iface.getProperties()) {
      const colName = prop.getName();
      const rawType = prop.getTypeNode()?.getText() ?? prop.getType().getText();
      const nullable = rawType.includes("| null") || rawType.includes("null |");

      // Gather JSDoc for this property.
      const propDocs = prop.getJsDocs();

      // Description: the prose part before any tags.
      const description = propDocs
        .map((d) => d.getDescription().trim())
        .join("\n")
        .trim();

      // @relation tag: read via ts-morph tag API so we don't have to regex
      // getDescription() (which strips tags before we can match them).
      let relation: RelationDoc | null = null;
      for (const doc of propDocs) {
        for (const tag of doc.getTags()) {
          if (tag.getTagName() === "relation") {
            // tag.getComment() returns the text after "@relation", e.g.
            // "phrase (one-to-one)"
            const raw =
              typeof tag.getComment() === "string" ?
                (tag.getComment() as string)
              : (tag.getComment()?.toString().trim() ?? "");
            const m = /^(\S+)\s+\(([^)]+)\)/.exec(raw.trim());
            if (m) {
              relation = {
                fromColumn: colName,
                toTable: m[1],
                cardinality: m[2].trim() as Cardinality,
              };
            }
            break;
          }
        }
        if (relation) break;
      }

      columns.push({
        name: colName,
        type: rawType,
        nullable,
        description,
        relation,
      });
      if (relation) relations.push(relation);
    }

    tables.push({
      name: ifaceName,
      tableName,
      kind,
      description: ifaceDescription,
      columns,
      relations,
    });
  }

  return { moduleName, tables };
}
