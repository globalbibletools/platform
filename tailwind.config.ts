import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

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
