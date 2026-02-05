import { cookies } from "next/headers";

/** Get the timezone of the client using the CLIENT_TZ header with a fallback to UTC. */
export async function getClientTimezone(): Promise<string> {
  const cookieStore = await cookies();
  const tz = cookieStore.get("CLIENT_TZ")?.value;

  return tz ?? "UTC";
}
