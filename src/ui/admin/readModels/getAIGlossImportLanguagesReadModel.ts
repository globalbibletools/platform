import { aiGlossImportService } from "@/modules/translation/data-access/aiGlossImportService";

// TODO: Cache this
export function getAIGlossImportLanguagesReadModel() {
  return aiGlossImportService.getAvailableLanguages();
}
