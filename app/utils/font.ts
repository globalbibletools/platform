export const secondaryFonts = ['Noto Sans', 'Noto Serif'];

/**
 * Add a secondary font to the given font, if needed.
 */
export const expandFontFamily = (font: string) => {
  for (const secondary of secondaryFonts) {
    if (font.startsWith(secondary) && font !== secondary) {
      return `"${font}", "${secondary}"`;
    }
  }
  return `"${font}", "Noto Sans"`;
};

