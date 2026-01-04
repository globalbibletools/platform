import userRepository from "../data-access/userRepository";
import { languageClient } from "@/modules/languages/public/LanguageClient";
import { NotFoundError } from "@/shared/errors";

export interface DisableUserRequest {
  userId: string;
}

export async function disableUser(request: DisableUserRequest): Promise<void> {
  const user = await userRepository.findById(request.userId);
  if (!user) throw new NotFoundError("User");

  await languageClient.removeUserFromLanguages(request.userId);

  user.disable();
  await userRepository.commit(user);
}
