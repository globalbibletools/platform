import { ulid } from "@/shared/ulid";
import { LanguageRepository } from "../data-access/types";
import { LanguageAlreadyExistsError } from "../model";

export interface CreateLanguageRequest {
  code: string;
  name: string;
}

export default class CreateLanguage {
  constructor(private readonly languageRepo: LanguageRepository) {}

  async execute(request: CreateLanguageRequest): Promise<void> {
    const exists = await this.languageRepo.existsByCode(request.code);
    if (exists) {
      throw new LanguageAlreadyExistsError(request.code);
    }

    await this.languageRepo.create({
      id: ulid(),
      ...request,
    });
  }
}
