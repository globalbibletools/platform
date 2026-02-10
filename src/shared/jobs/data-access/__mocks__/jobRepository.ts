import { MockedObject, vitest } from "vitest";
import originalJobRepository from "../jobRepository";

const jobRepository: MockedObject<typeof originalJobRepository> = {
  update: vitest.fn(),
  create: vitest.fn(),
  getById: vitest.fn().mockResolvedValue(undefined),
};
export default jobRepository;
