export interface UserClient {
  findOrInviteUser(email: string): Promise<string>;
}
