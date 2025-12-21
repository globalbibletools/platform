export interface LanguageClient {
  removeUserFromLanguages(userId: string): Promise<void>;
}
