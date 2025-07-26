export interface PublicLanguageView {
  id: string;
  name: string;
  code: string;
}

export interface LanguageClient {
  removeUserFromLanguages(userId: string): Promise<void>;
  findAllForUser(userId: string): Promise<PublicLanguageView[]>;
}
