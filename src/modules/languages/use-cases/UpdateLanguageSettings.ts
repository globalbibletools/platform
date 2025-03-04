import { NotFoundError } from "@/shared/errors";
import { LanguageRepository } from "../data-access/types";
import { TextDirectionRaw } from "../model";

export interface UpdateLanguageSettingsRequest {
  code: string;
  name: string;
  font: string;
  textDirection: TextDirectionRaw;
  translationIds: string[];
  gtSourceLanguage: string;
}

export default class UpdateLanguageSettings {
  constructor(private readonly languageRepo: LanguageRepository) {}

  async execute(request: UpdateLanguageSettingsRequest): Promise<void> {
    const exists = await this.languageRepo.existsByCode(request.code);
    if (!exists) throw new NotFoundError("Language");

    await this.languageRepo.update(request);
  }
}
