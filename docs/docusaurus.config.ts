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
