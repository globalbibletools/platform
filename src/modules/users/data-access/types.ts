import User from "../model/User";

export interface UserRepository {
  findByEmail(email: string): Promise<User | undefined>;
}
