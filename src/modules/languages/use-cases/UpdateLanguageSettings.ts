import { NotFoundError } from "@/shared/errors";
import { LanguageRepository } from "../data-access/types";
import { SourceLanguageMissingError, TextDirectionRaw } from "../model";

export interface UpdateLanguageSettingsRequest {
  code: string;
  name: string;
  font: string;
  textDirection: TextDirectionRaw;
  translationIds: string[];
  referenceLanguageId?: string;
}

export default class UpdateLanguageSettings {
  constructor(private readonly languageRepo: LanguageRepository) {}

  async execute(request: UpdateLanguageSettingsRequest): Promise<void> {
    const exists = await this.languageRepo.existsByCode(request.code);
    if (!exists) throw new NotFoundError("Language");

    if (request.referenceLanguageId) {
      const exists = await this.languageRepo.existsById(
        request.referenceLanguageId,
      );
      if (!exists)
        throw new SourceLanguageMissingError(request.referenceLanguageId);
    }

    await this.languageRepo.update(request);
  }
}
