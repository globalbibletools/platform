import * as fs from "fs";
import * as path from "path";
import type { LoadContext, Plugin } from "@docusaurus/types";
import { parseSchema, SchemaDoc } from "./parser";

// ─── Discovery helpers ────────────────────────────────────────────────────────

export interface ModuleEntry {
  /** e.g. "bible-core" or "jobs" (for shared) */
  name: string;
  /** Display label used in the sidebar, e.g. "Bible Core" */
  label: string;
  /** Absolute path to db/schema.ts */
  schemaFile: string;
}

function toLabel(name: string): string {
  return name
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function getSchemaModules(repoRoot: string): ModuleEntry[] {
  const entries: ModuleEntry[] = [];

  // src/modules/*/db/schema.ts
  const modulesDir = path.join(repoRoot, "src/modules");
  if (fs.existsSync(modulesDir)) {
    for (const entry of fs.readdirSync(modulesDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const schemaFile = path.join(modulesDir, entry.name, "db/schema.ts");
      if (fs.existsSync(schemaFile)) {
        entries.push({
          name: entry.name,
          label: toLabel(entry.name),
          schemaFile,
        });
      }
    }
  }

  // src/shared/*/db/schema.ts
  const sharedDir = path.join(repoRoot, "src/shared");
  if (fs.existsSync(sharedDir)) {
    for (const entry of fs.readdirSync(sharedDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const schemaFile = path.join(sharedDir, entry.name, "db/schema.ts");
      if (fs.existsSync(schemaFile)) {
        entries.push({
          name: entry.name,
          label: toLabel(entry.name),
          schemaFile,
        });
      }
    }
  }

  return entries;
}

// ─── Plugin ───────────────────────────────────────────────────────────────────

export default function schemaDocsPlugin(
  context: LoadContext,
): Plugin<SchemaDoc[]> {
  const repoRoot = path.resolve(context.siteDir, "..");

  return {
    name: "schema-docs-plugin",

    getPathsToWatch() {
      return getSchemaModules(repoRoot).map((m) => m.schemaFile);
    },

    async loadContent(): Promise<SchemaDoc[]> {
      const modules = getSchemaModules(repoRoot);
      return modules.map((m) => parseSchema(m.schemaFile, m.name));
    },

    async contentLoaded({ content, actions }) {
      const { createData, addRoute } = actions;

      // The sidebar-items.json is written by allContentLoaded into the same
      // dataDir as our other generated files. Its path is deterministic.
      const sidebarItemsPath = path.join(
        context.generatedFilesDir,
        "schema-docs-plugin",
        "default",
        "sidebar-items.json",
      );

      for (const schemaDoc of content) {
        if (!schemaDoc.tables.length) continue;

        const dataPath = await createData(
          `schema-${schemaDoc.moduleName}.json`,
          JSON.stringify(schemaDoc),
        );

        addRoute({
          path: `/modules/${schemaDoc.moduleName}/schema`,
          component: "@site/src/plugins/schema-page/SchemaPage",
          modules: {
            schemaData: dataPath,
            sidebarItems: sidebarItemsPath,
          },
          exact: true,
        });
      }
    },

    // allContentLoaded runs after all plugins have loaded their content.
    // We use it to access the docs plugin's processed sidebar items and store
    // them so SchemaPage can mount DocsSidebarProvider with the correct data.
    async allContentLoaded({ allContent, actions }) {
      const { createData } = actions;

      // Reach into the docs plugin's loaded version to get processed sidebar data.
      const docsContent = (allContent as any)["docusaurus-plugin-content-docs"]
        ?.default;
      if (!docsContent?.loadedVersions?.length) return;

      const loadedVersion = docsContent.loadedVersions[0];

      // Replicate toSidebarsProp from @docusaurus/plugin-content-docs/lib/props.js
      // to convert raw sidebar item config into the PropSidebarItem[] format
      // that DocSidebar can render (doc IDs resolved to permalink hrefs).
      const docsById = Object.fromEntries(
        (loadedVersion.docs as any[]).map((doc: any) => [doc.id, doc]),
      );

      function getDocById(id: string): any {
        return docsById[id];
      }

      function normalizeItem(item: any): any {
        switch (item.type) {
          case "category": {
            const { link, ...rest } = item;
            let href: string | undefined;
            if (link?.type === "doc") {
              href = getDocById(link.id)?.permalink;
            } else if (link?.type === "generated-index") {
              href = link.permalink;
            }
            return {
              ...rest,
              items: (item.items as any[]).map(normalizeItem),
              ...(href ? { href } : {}),
            };
          }
          case "ref":
          case "doc": {
            const doc = getDocById(item.id);
            if (!doc) return item;
            return {
              type: "link",
              label: item.label ?? doc.frontMatter?.sidebar_label ?? doc.title,
              href: doc.permalink,
              docId: doc.id,
              unlisted: doc.unlisted,
            };
          }
          default:
            return item;
        }
      }

      const processedSidebars: Record<string, any[]> = {};
      for (const [sidebarId, items] of Object.entries(
        loadedVersion.sidebars as Record<string, any[]>,
      )) {
        processedSidebars[sidebarId] = items.map(normalizeItem);
      }

      await createData("sidebar-items.json", JSON.stringify(processedSidebars));
    },
  };
}
