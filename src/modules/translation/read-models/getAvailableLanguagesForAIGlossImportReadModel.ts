import { unstable_cache } from "next/cache";
import { machineGlossGenerationService } from "../data-access/machineGlossGenerationService";

export const getAvailableLanguagesForAIGlossImportReadModel = unstable_cache(
  () => machineGlossGenerationService.getAvailableLanguages(),
  ["ai-gloss-import-available-languages"],
);
