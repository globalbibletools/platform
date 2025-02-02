import UserAuthentication from "./UserAuthentication";
import UserEmail from "./UserEmail";

export interface UserProps {
  id: string;
  name?: string;
  email: UserEmail;
  auth?: UserAuthentication;
}

export default class User {
  constructor(private props: UserProps) {}

  get id() {
    return this.props.id;
  }

  get name() {
    return this.props.name;
  }

  get email() {
    return this.props.email;
  }

  get auth() {
    return this.props.auth;
  }
}
