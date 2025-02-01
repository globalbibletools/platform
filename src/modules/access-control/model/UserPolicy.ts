import { SystemRoleValue } from "./SystemRole";

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
  systemRoles: SystemRoleValue[];
}

export default class UserPolicy {
  constructor(private props: UserPolicyProps) {}

  get isPlatformAdmin(): boolean {
    return this.props.systemRoles.includes(SystemRoleValue.Admin);
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

  static Public = new UserPolicy({ systemRoles: [] });
}
