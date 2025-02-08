import User from "../model/User";

export interface UserRepository {
  findById(id: string): Promise<User | undefined>;
  findByEmail(email: string): Promise<User | undefined>;
  commit(user: User): Promise<void>;
}
