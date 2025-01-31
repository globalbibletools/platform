export enum SystemRoleValue {
  Admin = "ADMIN",
}
export default class SystemRole {
  readonly value: SystemRoleValue;

  private constructor(value: SystemRoleValue) {
    this.value = value;
  }

  static fromRaw(value: SystemRoleValue): SystemRole {
    switch (value) {
      case SystemRoleValue.Admin:
        return SystemRole.Admin;
      default:
        throw new Error(`Invalid UserSystemRole: ${value}`);
    }
  }

  static Admin = new SystemRole(SystemRoleValue.Admin);
}
