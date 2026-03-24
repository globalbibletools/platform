import { createIsomorphicFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";

export interface ClientCookieOptions {
  readonly path?: string;
  readonly maxAge?: number;
  readonly sameSite?: "lax" | "strict" | "none";
}

export const readCookie = createIsomorphicFn()
  .server((name: string) => {
    return getCookie(name);
  })
  .client((name: string) => {
    return parseCookieHeader(document.cookie)[name];
  });

export function setClientCookie(
  name: string,
  value: string,
  options: ClientCookieOptions = {},
) {
  const path = options.path ?? "/";
  const sameSite = options.sameSite ?? "lax";

  const cookieParts = [
    `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
    `path=${path}`,
    `SameSite=${sameSite}`,
  ];

  if (typeof options.maxAge === "number") {
    cookieParts.push(`max-age=${options.maxAge}`);
  }

  document.cookie = cookieParts.join("; ");
}

function parseCookieHeader(cookieHeader: string): Record<string, string> {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader
    .split(";")
    .map((cookiePart) => cookiePart.trim())
    .filter((cookiePart) => cookiePart.length > 0)
    .reduce<Record<string, string>>((cookies, cookiePart) => {
      const separatorIndex = cookiePart.indexOf("=");

      if (separatorIndex < 0) {
        return cookies;
      }

      const name = decodeURIComponent(
        cookiePart.slice(0, separatorIndex).trim(),
      );
      const value = decodeURIComponent(
        cookiePart.slice(separatorIndex + 1).trim(),
      );

      cookies[name] = value;
      return cookies;
    }, {});
}
