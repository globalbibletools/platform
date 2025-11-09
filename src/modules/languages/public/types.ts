export interface PublicLanguageView {
  id: string;
  english_name: string;
  local_name: string;
  code: string;
}

export interface LanguageClient {
  removeUserFromLanguages(userId: string): Promise<void>;
  findAllForUser(userId: string): Promise<PublicLanguageView[]>;
}
