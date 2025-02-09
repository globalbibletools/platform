export enum UserStatusRaw {
  Active = "active",
  Disabled = "disabled",
}

export default class UserStatus {
  private constructor(readonly value: UserStatusRaw) {}

  fromRaw(raw: string): UserStatus {
    switch (raw) {
      case UserStatusRaw.Active:
        return UserStatus.Active;
      case UserStatusRaw.Disabled:
        return UserStatus.Disabled;
      default:
        throw new Error(`Invalid UserStatus: ${raw}`);
    }
  }

  static Active = new UserStatus(UserStatusRaw.Active);
  static Disabled = new UserStatus(UserStatusRaw.Disabled);
}
