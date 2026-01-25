import { removeUserFromLanguages } from "../use-cases/removeUserFromLanguages";

export const languageClient = {
  // Eventually, this should be handled by an event from the user system
  // rather than a direct call.
  async removeUserFromLanguages(userId: string): Promise<void> {
    await removeUserFromLanguages({ userId });
  },
};
