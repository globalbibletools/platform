export interface PublicLanguageView {
  id: string;
  englishName: string;
  localName: string;
  code: string;
}

export interface LanguageClient {
  removeUserFromLanguages(userId: string): Promise<void>;
  findAllForUser(userId: string): Promise<PublicLanguageView[]>;
}
