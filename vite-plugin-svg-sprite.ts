import { readFileSync, readdirSync } from "fs";
import { resolve, join } from "path";
import type { Plugin } from "vite";
import { createHash } from "crypto";

const ICONS_DIR = resolve(__dirname, "src/assets/icons");

function generateSprite(): string {
  const files = readdirSync(ICONS_DIR).filter((f) => f.endsWith(".svg"));

  const symbols = files.map((file) => {
    const content = readFileSync(join(ICONS_DIR, file), "utf-8");
    const name = file.replace(/\.svg$/, "");

    // Extract viewBox and inner content from the SVG
    const viewBoxMatch = content.match(/viewBox="([^"]+)"/);
    const viewBox = viewBoxMatch ? viewBoxMatch[1] : "0 0 512 512";

    // Extract everything between <svg ...> and </svg>
    const innerMatch = content.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
    const innerContent = innerMatch ? innerMatch[1].trim() : "";

    return `  <symbol id="${name}" viewBox="${viewBox}">\n    ${innerContent}\n  </symbol>`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg">${symbols.join("\n")}</svg>`;
}

export function svgSpritePlugin(): Plugin {
  const spriteContent = generateSprite();
  const spriteHash = createHash("md5")
    .update(spriteContent)
    .digest("hex")
    .slice(0, 8);
  const spriteUrl = `/assets/icon-sprite-${spriteHash}.svg`;

  return {
    name: "vite-plugin-svg-sprite",

    config() {
      return {
        define: {
          __ICON_SPRITE_URL__: JSON.stringify(spriteUrl),
        },
      };
    },

    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === spriteUrl) {
          res.setHeader("Content-Type", "image/svg+xml");
          res.setHeader("Cache-Control", "no-cache");
          res.end(spriteContent);
          return;
        }
        next();
      });
    },

    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: spriteUrl.slice(1), // Remove leading /
        source: spriteContent,
      });
    },

    transformIndexHtml(html: string) {
      return html.replace(
        "</head>",
        `  <link rel="preload" href="${spriteUrl}" as="image" type="image/svg+xml" />\n  </head>`,
      );
    },
  };
}
