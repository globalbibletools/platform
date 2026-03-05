import * as React from "react";
import Layout from "@theme/Layout";
import DocRootLayout from "@theme/DocRoot/Layout";
import {
  HtmlClassNameProvider,
  ThemeClassNames,
} from "@docusaurus/theme-common";
import { DocsSidebarProvider } from "@docusaurus/plugin-content-docs/client";
import type { PropSidebarItem } from "@docusaurus/plugin-content-docs";
import Mermaid from "@theme/Mermaid";
import type { SchemaDoc, TableDoc, RelationDoc, Cardinality } from "./parser";

// ─── Mermaid ER diagram ───────────────────────────────────────────────────────

/** Map @relation cardinality strings to Mermaid ER notation. */
const CARDINALITY_MAP: Record<Cardinality, [string, string]> = {
  "many-to-one": ["}o", "||"],
  "one-to-many": ["||", "o{"],
  "one-to-one": ["||", "||"],
  "many-to-many": ["}o", "o{"],
};

function buildErDiagram(tables: TableDoc[]): string | null {
  const lines: string[] = [];
  for (const table of tables) {
    for (const rel of table.relations) {
      const mapping = CARDINALITY_MAP[rel.cardinality];
      if (!mapping) continue;
      const [leftEdge, rightEdge] = mapping;
      lines.push(
        `  ${table.tableName} ${leftEdge}--${rightEdge} ${rel.toTable} : "${rel.fromColumn}"`,
      );
    }
  }
  if (!lines.length) return null;
  return `erDiagram\n${lines.join("\n")}`;
}

// ─── Column type display ──────────────────────────────────────────────────────

/** Strip Kysely wrapper types like Generated<T> → T for display. */
function displayType(raw: string): string {
  return raw
    .replace(/Generated<([^>]+)>/g, "$1")
    .replace(/JSONColumnType<([^>]+)>/g, "json ($1)")
    .trim();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Badge({ kind }: { kind: "table" | "view" }) {
  const style: React.CSSProperties = {
    display: "inline-block",
    marginLeft: "0.5rem",
    padding: "0.15rem 0.5rem",
    borderRadius: "4px",
    fontSize: "0.75rem",
    fontWeight: 600,
    verticalAlign: "middle",
    backgroundColor:
      kind === "view" ?
        "var(--ifm-color-info-contrast-background, #e8f4fd)"
      : "var(--ifm-color-success-contrast-background, #e6f4ea)",
    color:
      kind === "view" ?
        "var(--ifm-color-info-dark, #1a6ea8)"
      : "var(--ifm-color-success-dark, #1a7a3a)",
    border: `1px solid ${kind === "view" ? "var(--ifm-color-info, #3578e5)" : "var(--ifm-color-success, #00a400)"}`,
  };
  return <span style={style}>{kind}</span>;
}

function RelationshipsTable({ relations }: { relations: RelationDoc[] }) {
  if (!relations.length) return null;
  return (
    <>
      <h3>Relationships</h3>
      <table>
        <thead>
          <tr>
            <th>Column</th>
            <th>Related Table</th>
            <th>Cardinality</th>
          </tr>
        </thead>
        <tbody>
          {relations.map((r) => (
            <tr key={r.fromColumn}>
              <td>
                <code>{r.fromColumn}</code>
              </td>
              <td>
                <code>{r.toTable}</code>
              </td>
              <td>{r.cardinality}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function TableSection({ table }: { table: TableDoc }) {
  return (
    <section style={{ marginBottom: "2.5rem" }}>
      <h2 style={{ marginBottom: table.description ? "0.25rem" : undefined }}>
        <code>{table.tableName}</code>
        <Badge kind={table.kind} />
        {table.description && (
          <span
            style={{
              fontSize: "1rem",
              fontWeight: 400,
              marginLeft: "0.75rem",
              color: "var(--ifm-color-secondary-darkest, #666)",
              verticalAlign: "middle",
            }}
          >
            — {table.description}
          </span>
        )}
      </h2>

      <h3>Columns</h3>
      <table>
        <thead>
          <tr>
            <th>Column</th>
            <th>Type</th>
            <th>Nullable</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {table.columns.map((col) => (
            <tr key={col.name}>
              <td>
                <code>{col.name}</code>
              </td>
              <td>
                <code>{displayType(col.type)}</code>
              </td>
              <td style={{ textAlign: "center" }}>
                {col.nullable ? "yes" : "no"}
              </td>
              <td>
                {col.description || (
                  <span
                    style={{
                      color: "var(--ifm-color-secondary-darkest, #999)",
                    }}
                  >
                    —
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <RelationshipsTable relations={table.relations} />
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface SchemaPageProps {
  schemaData: SchemaDoc;
  sidebarItems: Record<string, PropSidebarItem[]>;
}

export default function SchemaPage({
  schemaData,
  sidebarItems,
}: SchemaPageProps) {
  const { moduleName, tables } = schemaData;
  const erDiagram = buildErDiagram(tables);

  const title = moduleName
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  // The sidebar items for the main docs sidebar.
  const docsSidebarItems = sidebarItems?.docsSidebar as
    | PropSidebarItem[]
    | undefined;

  const content = (
    <main className="container margin-vert--lg" style={{ maxWidth: "960px" }}>
      <h1>{title} — Database Schema</h1>
      <p>
        Auto-generated from <code>src/modules/{moduleName}/db/schema.ts</code>.
        Edit the JSDoc comments in that file to update this page.
      </p>

      {erDiagram && (
        <>
          <h2>Entity Relationships</h2>
          <Mermaid value={erDiagram} />
        </>
      )}

      {tables.map((t) => (
        <TableSection key={t.name} table={t} />
      ))}
    </main>
  );

  return (
    <Layout
      title={`${title} — Database Schema`}
      description={`Database schema for the ${title} module`}
    >
      {docsSidebarItems ?
        <HtmlClassNameProvider className={ThemeClassNames.page.docsDocPage}>
          <DocsSidebarProvider name="docsSidebar" items={docsSidebarItems}>
            <DocRootLayout>{content}</DocRootLayout>
          </DocsSidebarProvider>
        </HtmlClassNameProvider>
      : content}
    </Layout>
  );
}
