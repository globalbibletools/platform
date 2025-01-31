import type SystemRole from "./SystemRole";

export interface UserSystemAccessProps {
  userId: string;
  systemRoles: SystemRole[];
}

export default class UserSystemAccess {
  private props: UserSystemAccessProps;

  get userId(): string {
    return this.props.userId;
  }

  get systemRoles(): readonly SystemRole[] {
    return this.props.systemRoles;
  }

  grantAccess(roles: SystemRole[]) {
    this.props.systemRoles = roles;
  }

  constructor(props: UserSystemAccessProps) {
    this.props = props;
  }
}
