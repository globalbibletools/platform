import { NotFoundError } from "@/shared/errors";
import { UserRepository } from "../data-access/types";
import { IncorrectPasswordError } from "../model/errors";

export interface LogInRequest {
  email: string;
  password: string;
}

export interface LogInResponse {
  userId: string;
}

export default class LogIn {
  constructor(private readonly userRepo: UserRepository) {}

  async execute(request: LogInRequest): Promise<LogInResponse> {
    const user = await this.userRepo.findByEmail(request.email);
    if (!user) throw new NotFoundError("User");

    const passwordMatched = await user.password?.verify(request.password);
    if (!passwordMatched) {
      throw new IncorrectPasswordError();
    }

    return { userId: user.id };
  }
}
