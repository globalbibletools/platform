import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";
import defaultTheme from "tailwindcss/defaultTheme";
import colors from "tailwindcss/colors";

// Our tailwind rtl utilities are originally based off of tailwindcss-rtl.
const rtl = plugin(({ addUtilities, matchUtilities, theme }) => {
  // https://github.com/20lives/tailwindcss-rtl
  matchUtilities(
    {
      ps: (value) => ({
        paddingInlineStart: value,
      }),
      pe: (value) => ({
        paddingInlineEnd: value,
      }),
    },
    {
      supportsNegativeValues: true,
      values: theme("padding"),
    },
  );

  matchUtilities(
    {
      ms: (value) => ({
        marginInlineStart: value,
      }),
      me: (value) => ({
        marginInlineEnd: value,
      }),
    },
    {
      supportsNegativeValues: true,
      values: theme("margin"),
    },
  );

  matchUtilities(
    {
      start: (value) => ({
        '[dir="rtl"] &, &[dir="rtl"]': {
          right: value,
        },
        '[dir="ltr"] &, &[dir="ltr"]': {
          left: value,
        },
      }),
      end: (value) => ({
        '[dir="rtl"] &, &[dir="rtl"]': {
          left: value,
        },
        '[dir="ltr"] &, &[dir="ltr"]': {
          right: value,
        },
      }),
    },
    {
      supportsNegativeValues: true,
      values: theme("inset"),
    },
  );

  addUtilities({
    '[dir="rtl"] .text-start': { "text-align": "right" },
    '[dir="rtl"] .text-end': { "text-align": "left" },
    '[dir="ltr"] .text-end': { "text-align": "right" },
    '[dir="ltr"] .text-start': { "text-align": "left" },
  });
});

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/modules/*/views/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/modules/*/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/modules/*/react/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/languages.json",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", ...defaultTheme.fontFamily.sans],
        hebrew: [
          "var(--font-sbl-hebrew)",
          "var(--font-sans)",
          ...defaultTheme.fontFamily.sans,
        ],
        greek: [
          "var(--font-sbl-greek)",
          "var(--font-sans)",
          ...defaultTheme.fontFamily.sans,
        ],
        mixed: [
          "var(--font-sbl-greek)",
          "var(--font-sbl-hebrew)",
          "var(--font-sans)",
          ...defaultTheme.fontFamily.sans,
        ],
      },
      boxShadow: {
        left: "-1px 0 3px 0 rgb(0 0 0 / 0.1), -1px 0 2px -1px rgb(0 0 0 / 0.1)",
        right: "1px 0 3px 0 rgb(0 0 0 / 0.1), 1px 0 2px -1px rgb(0 0 0 / 0.1)",
      },
    },
    colors: {
      transparent: "transparent",
      current: "currentColor",
      black: colors.black,
      white: colors.white,
      gray: colors.stone,
      red: colors.red,
      green: {
        50: "#F3FAF8",
        100: "#D8EFEB",
        200: "#B2DDD7",
        300: "#83C5BE", // brand
        400: "#59A8A2",
        500: "#3F8D88",
        600: "#31706E",
        700: "#2A5B5A",
        800: "#254A49",
        900: "#233E3E",
        950: "#0C0A09",
      },
      blue: {
        50: "#F0FFFD",
        100: "#C7FFFB",
        200: "#8AFEF9",
        300: "#55F6EE",
        400: "#13ECE8",
        500: "#01D0D0",
        600: "#01A5A7",
        700: "#018084",
        800: "#066F74", // brand
        900: "#0A5457",
        950: "#002E33",
      },
      brown: {
        50: "#F8F7EE",
        100: "#F0EDD9", // brand
        200: "#DED6AA",
        300: "#CBBA79",
        400: "#BBA154",
        500: "#AC8E46",
        600: "#93733B",
        700: "#775731",
        800: "#64492F",
        900: "#573E2C",
        950: "#312117",
      },
    },
  },
  plugins: [
    rtl,
    require("@headlessui/tailwindcss"),
    plugin(({ addVariant }) => {
      addVariant(
        "slider-thumb",
        "&::-webkit-slider-thumb, &::-moz-range-thumb",
      );
      addVariant(
        "slider-track",
        "&::-webkit-slider-runnable-track, &::-moz-range-track",
      );
    }),
  ],
};

export default config;
