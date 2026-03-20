import { aiGlossImportService } from "../data-access/aiGlossImportService";

// TODO: Cache this
export function getAIGlossImportLanguagesReadModel() {
  return aiGlossImportService.getAvailableLanguages();
}
