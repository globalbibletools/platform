import { LanguageClient } from "@/modules/languages/public/types";
import { UserRepository } from "../data-access/types";
import { NotFoundError } from "@/shared/errors";

export interface DisableUserRequest {
  userId: string;
}

export default class DisableUser {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly languageClient: LanguageClient,
  ) {}

  async execute(request: DisableUserRequest): Promise<void> {
    const user = await this.userRepo.findById(request.userId);
    if (!user) throw new NotFoundError("User");

    await this.languageClient.removeUserFromLanguages(request.userId);

    user.disable();
    await this.userRepo.commit(user);
  }
}
