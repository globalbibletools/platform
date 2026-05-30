import { readFileSync, readdirSync } from "fs";
import { resolve, join } from "path";
import type { Plugin } from "vite";
import { createHash } from "crypto";

const ICONS_DIR = resolve(__dirname, "src/assets/icons");

const VIRTUAL_MODULE_ID = "virtual:icon-sprite-url";
const RESOLVED_ID = "\0" + VIRTUAL_MODULE_ID;

function generateSprite(): string {
  const files = readdirSync(ICONS_DIR).filter((f) => f.endsWith(".svg"));

  const symbols = files.map((file) => {
    const content = readFileSync(join(ICONS_DIR, file), "utf-8");
    const name = file.replace(/\.svg$/, "");

    const viewBoxMatch = content.match(/viewBox="([^"]+)"/);
    const viewBox = viewBoxMatch ? viewBoxMatch[1] : "0 0 512 512";

    const innerMatch = content.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
    const innerContent = innerMatch ? innerMatch[1].trim() : "";

    return `  <symbol id="${name}" viewBox="${viewBox}">\n    ${innerContent}\n  </symbol>`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg">${symbols.join("\n")}</svg>`;
}

function contentHash(content: string): string {
  return createHash("md5").update(content).digest("hex").slice(0, 8);
}

export function svgSpritePlugin(): Plugin {
  let spriteContent = generateSprite();
  let isServe = false;

  function getSpriteUrl(): string {
    const hash = contentHash(spriteContent);
    if (isServe) {
      // Dev: cache-bust via query param so browser re-fetches on change
      return `/assets/icon-sprite.svg?v=${hash}`;
    }
    // Build: content hash in filename for long-term caching
    return `/assets/icon-sprite-${hash}.svg`;
  }

  function isIconFile(file: string): boolean {
    return file.startsWith(ICONS_DIR) && file.endsWith(".svg");
  }

  function regenerate(server: ViteDevServer) {
    spriteContent = generateSprite();
    const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
    if (mod) {
      server.moduleGraph.invalidateModule(mod);
    }
  }

  return {
    name: "vite-plugin-svg-sprite",

    config(_, { command }) {
      isServe = command === "serve";
    },

    resolveId(id) {
      if (id === VIRTUAL_MODULE_ID) return RESOLVED_ID;
    },

    load(id) {
      if (id === RESOLVED_ID) {
        return `export const SPRITE_URL = ${JSON.stringify(getSpriteUrl())};`;
      }
    },

    configureServer(server) {
      server.watcher.add(ICONS_DIR);

      server.watcher.on("all", (event, file) => {
        if (["add", "change", "unlink"].includes(event) && isIconFile(file)) {
          regenerate(server);
        }
      });

      server.middlewares.use((req, res, next) => {
        // Match pathname, ignoring query params used for cache busting
        if (req.url?.startsWith("/assets/icon-sprite.svg")) {
          res.setHeader("Content-Type", "image/svg+xml");
          res.setHeader("Cache-Control", "no-store");
          res.end(spriteContent);
          return;
        }
        next();
      });
    },

    generateBundle() {
      const hash = contentHash(spriteContent);
      const fileName = `assets/icon-sprite-${hash}.svg`;
      this.emitFile({
        type: "asset",
        fileName,
        source: spriteContent,
      });
    },

    transformIndexHtml(html: string) {
      const url = getSpriteUrl();
      return html.replace(
        "</head>",
        `  <link rel="preload" href="${url}" as="image" type="image/svg+xml" />\n  </head>`,
      );
    },
  };
}
