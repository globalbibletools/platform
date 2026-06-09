import { MockedObject, vitest } from "vitest";
import originalJobRepository from "../jobRepository";

const jobRepository: MockedObject<typeof originalJobRepository> = {
  getById: vitest.fn().mockResolvedValue(undefined),
  commit: vitest.fn(),
};
export default jobRepository;
