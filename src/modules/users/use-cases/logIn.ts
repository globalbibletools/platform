import { NotFoundError } from "@/shared/errors";
import userRepository from "../data-access/userRepository";
import { IncorrectPasswordError } from "../model/errors";

export interface LogInRequest {
  email: string;
  password: string;
}

export interface LogInResponse {
  userId: string;
}

export async function logIn(request: LogInRequest): Promise<LogInResponse> {
  const user = await userRepository.findByEmail(request.email);
  if (!user) throw new NotFoundError("User");

  const passwordMatched = await user.password?.verify(request.password);
  if (!passwordMatched) {
    throw new IncorrectPasswordError();
  }

  return { userId: user.id };
}
