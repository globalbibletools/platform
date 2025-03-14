import User from "../model/User";

export interface UserRepository {
  existsByEmail(email: string): Promise<boolean>;
  findById(id: string): Promise<User | undefined>;
  findByEmail(email: string): Promise<User | undefined>;
  findByResetPasswordToken(token: string): Promise<User | undefined>;
  findByEmailVerificationToken(token: string): Promise<User | undefined>;
  findByInvitationToken(token: string): Promise<User | undefined>;
  commit(user: User): Promise<void>;
}

export interface SimpleUserView {
  id: string;
  name?: string;
  email: string;
}

export interface SearchUserView {
  id: string;
  name: string;
  email: string;
  emailStatus: string;
  roles: string[];
  invite: null | {
    token: string;
    expires: number;
  };
}

export interface SearchUserPageView {
  total: number;
  page: SearchUserView[];
}

export interface SearchUserOptions {
  page: number;
  limit: number;
}

export interface UserQueryService {
  findByEmail(email: string): Promise<SimpleUserView | undefined>;
  findById(id: string): Promise<SimpleUserView | undefined>;
  search(options: SearchUserOptions): Promise<SearchUserPageView>;
}
