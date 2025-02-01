import SystemRole, { SystemRoleValue } from "./SystemRole";

const ABILITIES = {
  "user-access": ["update"],
  language: ["create"],
} as const;

export type Resource = keyof typeof ABILITIES;
export type ResourceAction<R extends Resource> = (typeof ABILITIES)[R][number];
export type Action<R extends Resource> = {
  resourceType: R;
  resourceId?: string;
  action: ResourceAction<R>;
};

export interface UserPolicyProps {
  userId: string;
  systemRoles: SystemRole[];
}

export default class UserPolicy {
  constructor(private props: UserPolicyProps) {}

  get userId(): string {
    return this.props.userId;
  }

  get systemRoles(): SystemRole[] {
    return this.props.systemRoles;
  }

  get isPlatformAdmin(): boolean {
    return this.props.systemRoles.includes(SystemRole.Admin);
  }

  replaceSystemRoles(roles: SystemRole[]) {
    this.props.systemRoles = roles;
  }

  verifyAction<R extends Resource>({
    action,
    resourceType,
  }: Action<R>): boolean {
    switch (resourceType) {
      case "user-access":
        switch (action) {
          case "update":
            return this.isPlatformAdmin;
        }
      case "language":
        switch (action) {
          case "create":
            return this.isPlatformAdmin;
        }
    }

    return false;
  }

  static Public = new UserPolicy({ systemRoles: [], userId: "public" });
}
