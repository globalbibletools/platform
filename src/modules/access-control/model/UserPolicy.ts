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

interface BaseRolePolicy {
  verifyAction<R extends Resource>(action: Action<R>): boolean;
}

export class SystemRolePolicy implements BaseRolePolicy {
  constructor(readonly role: SystemRoleValue) {}

  verifyAction<R extends Resource>({
    resourceType,
    action,
  }: Action<R>): boolean {
    switch (resourceType) {
      case "user-access":
        switch (action) {
          case "update":
            return this.role === SystemRoleValue.Admin;
        }
      case "language":
        switch (action) {
          case "create":
            return this.role === SystemRoleValue.Admin;
        }
    }

    return false;
  }
}

type RolePolicy = SystemRolePolicy;

export interface UserPolicyProps {
  policies: RolePolicy[];
}

export default class UserPolicy {
  constructor(private props: UserPolicyProps) {}

  verifyAction<R extends Resource>(action: Action<R>): boolean {
    return this.props.policies.some((policy) => policy.verifyAction(action));
  }

  static Public = new UserPolicy({ policies: [] });
}
