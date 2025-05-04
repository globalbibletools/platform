import { sessionFactory } from "@/modules/users/test-utils/factories";
import { cookies } from "./mocks/nextjs";

export default async function logIn(userId: string) {
  const session = await sessionFactory.build({ userId });
  cookies.get.mockReturnValue({ value: session.id });
}
