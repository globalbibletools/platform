import { Noto_Sans, Noto_Sans_Arabic } from "next/font/google";
import localFont from "next/font/local";

export const notoSans = Noto_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-noto-sans",
  adjustFontFallback: false,
});

export const notoSansArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  display: "swap",
  variable: "--font-noto-sans-arabic",
  adjustFontFallback: false,
});

/*
Both Hebrew and Greek fonts have Latin characters that we want to use other fonts to render.
Restricting the unicode range allows other fonts to render those characters instead.

Additionally, Hebrew and to a lesser extent Greek, are harder to read at standard font sizes,
so we scale them up a bit so that we don't have to set different font sizes for each language with css.
*/
export const sblHebrew = localFont({
  weight: "normal",
  src: "./fonts/SBL_Hbrw.ttf",
  display: "swap",
  variable: "--font-sbl-hebrew",
  adjustFontFallback: false,
  declarations: [
    { prop: "unicode-range", value: "U+0590-05FF" },
    { prop: "size-adjust", value: "140%" },
  ],
});

export const sblGreek = localFont({
  weight: "normal",
  src: "./fonts/SBL_grk.ttf",
  display: "swap",
  variable: "--font-sbl-greek",
  adjustFontFallback: false,
  declarations: [
    { prop: "unicode-range", value: "U+0370-03FF, U+1F00-1FFF" },
    { prop: "size-adjust", value: "112%" },
  ],
});

export const headFontClass = [
  notoSans.variable,
  notoSansArabic.variable,
  sblHebrew.variable,
  sblGreek.variable,
].join(" ");

export const fontMap: Record<string, string> = {
  "Noto Sans": `var(--font-noto-sans)`,
  "Noto Sans Arabic": `var(--font-noto-sans-arabic), var(--font-noto-sans)`,
};
