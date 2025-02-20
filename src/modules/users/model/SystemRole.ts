export enum SystemRoleRaw {
  Admin = "ADMIN",
}

export default class SystemRole {
  private constructor(readonly value: SystemRoleRaw) {}

  static fromRaw(raw: string): SystemRole {
    switch (raw) {
      case SystemRoleRaw.Admin:
        return SystemRole.Admin;
      default:
        throw new Error(`Invalid UserStatus: ${raw}`);
    }
  }

  static Admin = new SystemRole(SystemRoleRaw.Admin);
}
