const IMPORT_SERVER = "https://hebrewgreekbible.online";

export const legacySiteService = {
  async fetchImportLanguages() {
    const response = await fetch(IMPORT_SERVER);
    const html = await response.text();

    const regex = /var glossLanguageNames\s*=\s*\[([\s\S]*?)\];/;
    const matches = html.match(regex);
    if (!matches?.[1]) return [];

    const languageNames = matches[1]
      .split(",")
      .map((name: string) => name.trim().replace(/['"]+/g, ""))
      .filter((name: string) => name.length > 0);
    return languageNames;
  },
};
