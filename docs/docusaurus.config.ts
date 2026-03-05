import * as fs from "fs";
import * as path from "path";
import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";


const config: Config = {
  title: "Global Bible Tools Developers",
  tagline: "Developer docs for Global Bible Tools platform",
  favicon: "img/favicon.ico",

  future: {
    v4: true,
  },

  url: "https://developers.globalbibletools.com",
  baseUrl: "/",

  organizationName: "globalbibletools",
  projectName: "platform",
  trailingSlash: false,

  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",

  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  plugins: [
    // Disable webpack's symlink resolution so that symlinked module docs
    // (docs/modules/<name> -> ../../../src/modules/<name>/docs) are seen by
    // the MDX loader under their symlink path rather than their realpath.
    // Without this, webpack resolves the realpath outside the site directory,
    // causing the loader's `include` filter and `metadataPath` lookup to fail,
    // which means the `metadata` export is never injected and DocItem crashes.
    function pluginDisableWebpackSymlinks() {
      return {
        name: "disable-webpack-symlinks",
        configureWebpack() {
          return {
            resolve: {
              symlinks: false,
            },
          };
        },
      };
    },
  ],

  presets: [
    [
      "classic",
      {
        docs: {
          routeBasePath: "/",
          sidebarPath: "./sidebars.ts",
          editUrl:
            "https://github.com/globalbibletools/platform/tree/main/docs",
        },
        blog: false,
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: "https://assets.globalbibletools.com/landing/logo.png",
    navbar: {
      title: "Developer Docs",
      logo: {
        alt: "Global Bible Tools Logo",
        src: "https://assets.globalbibletools.com/landing/logo.png",
      },
      items: [
        {
          href: "https://github.com/globalbibletools/platform",
          label: "GitHub",
          position: "right",
        },
      ],
    },
    footer: {
      copyright: `All content on this site is dedicated to the public domain under <a href="https://creativecommons.org/publicdomain/zero/1.0/">CC0 1.0 Universal</a>.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;

// Symlink each module's docs/ directory into docs/modules/<name> so that
// module documentation can live alongside source code in src/modules/<name>/docs/.
// This runs synchronously at config load time so the symlinks exist before the
// content plugin scans the filesystem.
(function linkModuleDocs() {
  const siteDir = __dirname;
  const repoRoot = path.resolve(siteDir, "..");
  const modulesDir = path.join(repoRoot, "src/modules");
  const docsModulesDir = path.join(siteDir, "docs/modules");

  const moduleNames = fs
    .readdirSync(modulesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  for (const name of moduleNames) {
    const moduleDocs = path.join(modulesDir, name, "docs");
    const symlinkPath = path.join(docsModulesDir, name);
    const relativeTarget = path.relative(docsModulesDir, moduleDocs);

    // Remove any pre-existing entry at the symlink path.
    // Use lstatSync rather than existsSync so broken symlinks are also caught.
    try {
      const stat = fs.lstatSync(symlinkPath);
      if (stat.isSymbolicLink() || stat.isDirectory()) {
        fs.rmSync(symlinkPath, { recursive: true });
      }
    } catch {
      // lstatSync throws if the path doesn't exist — nothing to remove.
    }

    if (fs.existsSync(moduleDocs)) {
      fs.symlinkSync(relativeTarget, symlinkPath);
    }
  }
})();
