import SystemRole, { SystemRoleValue } from "../model/SystemRole";
import UserPolicy from "../model/UserPolicy";
import { UserPolicyRepository } from "./types";

interface UserPolicyTestData {
  userId: string;
  systemRoles: SystemRoleValue[];
}

export default class MockUserPolicyRepository implements UserPolicyRepository {
  testData: UserPolicyTestData[] = [];

  reset() {
    this.testData = [];
  }

  seed(testData: UserPolicyTestData[]) {
    this.testData = testData;
  }

  async findByUserId(userId: string): Promise<UserPolicy> {
    const policy = this.testData.find((policy) => policy.userId === userId);
    return new UserPolicy({
      userId,
      systemRoles: policy?.systemRoles.map(SystemRole.fromRaw) ?? [],
    });
  }

  async commit(model: UserPolicy): Promise<void> {
    const policy = this.testData.find(
      (policy) => policy.userId === model.userId,
    );
    if (policy) {
      policy.systemRoles = model.systemRoles.map((role) => role.value);
    } else {
      this.testData.push({
        userId: model.userId,
        systemRoles: model.systemRoles.map((role) => role.value),
      });
    }
  }
}
