import { unstable_cache } from "next/cache";
import { aiGlossImportService } from "../data-access/aiGlossImportService";

export const getAIGlossImportLanguagesReadModel = unstable_cache(
  () => aiGlossImportService.getAvailableLanguages(),
  ["ai-gloss-import-available-languages"],
);
