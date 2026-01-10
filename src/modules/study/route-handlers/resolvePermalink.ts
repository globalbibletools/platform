import { logger } from "@/logging";
import { parseChapterPermalinkReference } from "@/verse-utils";
import { NextRequest, NextResponse } from "next/server";

const PERMALINK_PATHNAME_REGEX = /^\/p\/(\w+)\/(.+)$/;
const DEFAULT_LOCALE = "en";

export async function resolvePermalink(request: NextRequest) {
  const match = PERMALINK_PATHNAME_REGEX.exec(request.nextUrl.pathname);
  if (!match) {
    return new NextResponse("", { status: 404 });
  }

  const [, type, identifier] = match;

  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  const url = new URL(request.nextUrl.pathname, `${proto}://${host}`);

  switch (type) {
    default: {
      return new NextResponse("", { status: 404 });
    }
    case "ref": {
      let chapterId;
      try {
        chapterId = parseChapterPermalinkReference(identifier);
      } catch (error) {
        logger.error(error);
        return;
      }

      if (!chapterId) {
        return new NextResponse("", { status: 404 });
      }

      url.pathname = `/${DEFAULT_LOCALE}/read/eng/${chapterId}`;
      return NextResponse.redirect(url);
    }
  }
}
