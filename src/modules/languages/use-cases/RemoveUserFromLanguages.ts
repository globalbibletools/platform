import { LanguageMemberRepository } from "../data-access/types";

export interface RemoveUserFromLanguagesRequest {
  userId: string;
}

export default class RemoveUserFromLanguages {
  constructor(private readonly languageMemberRepo: LanguageMemberRepository) {}

  async execute(request: RemoveUserFromLanguagesRequest): Promise<void> {
    await this.languageMemberRepo.deleteAll(request.userId);
  }
}
