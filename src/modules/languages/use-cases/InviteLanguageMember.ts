import { UserClient } from "@/modules/users/public/types";
import {
  LanguageMemberRepository,
  LanguageRepository,
} from "../data-access/types";
import { NotFoundError } from "@/shared/errors";

export interface InviteLanguageMemberRequest {
  code: string;
  email: string;
}

export interface InviteLanguageMemberResponse {
  userId: string;
}

export default class InviteLanguageMember {
  constructor(
    private readonly languageRepo: LanguageRepository,
    private readonly languageMemberRepo: LanguageMemberRepository,
    private readonly userClient: UserClient,
  ) {}

  async execute(
    request: InviteLanguageMemberRequest,
  ): Promise<InviteLanguageMemberResponse> {
    const language = await this.languageRepo.findByCode(request.code);
    if (!language) throw new NotFoundError("Language");

    const userId = await this.userClient.findOrInviteUser(request.email);

    await this.languageMemberRepo.create({
      languageId: language.id,
      userId,
    });

    return { userId };
  }
}
