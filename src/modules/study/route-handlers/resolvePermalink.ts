import { logger } from "@/logging";
import { parseChapterPermalinkReference } from "@/verse-utils";
import { NextRequest, NextResponse } from "next/server";

const PERMALINK_PATHNAME_REGEX = /^\/p\/(\w+)\/(.+)$/;
const DEFAULT_LOCALE = "en";

export async function resolvePermalink(request: NextRequest) {
  const url = new URL(request.url);

  const match = PERMALINK_PATHNAME_REGEX.exec(url.pathname);
  if (!match) {
    return new NextResponse("", { status: 404 });
  }

  const [, type, identifier] = match;

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

      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = `/${DEFAULT_LOCALE}/read/eng/${chapterId}`;
      return NextResponse.redirect(redirectUrl);
    }
  }
}
