export interface PublicUserView {
  id: string;
  name?: string;
  email: string;
}

export interface UserClient {
  findOrInviteUser(email: string): Promise<string>;
  findUserById(userId: string): Promise<PublicUserView | undefined>;
}
