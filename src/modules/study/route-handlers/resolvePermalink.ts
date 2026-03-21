import { logger } from "@/logging";
import { parseChapterPermalinkReference } from "@/verse-utils";
import { notFound, ParsedLocation, redirect } from "@tanstack/react-router";

const PERMALINK_PATHNAME_REGEX = /^\/p\/(\w+)\/(.+)$/;

export function resolvePermalink(location: ParsedLocation): never {
  const match = PERMALINK_PATHNAME_REGEX.exec(location.pathname);
  if (!match) {
    throw notFound();
  }

  const [, type, identifier] = match;

  switch (type) {
    default: {
      throw notFound();
    }
    case "ref": {
      let chapterId;
      try {
        chapterId = parseChapterPermalinkReference(identifier);
      } catch (error) {
        logger.error(error);
        throw notFound();
      }

      if (!chapterId) {
        throw notFound();
      }

      throw redirect({
        to: "/read/$code/$chapterId",
        params: {
          code: "eng",
          chapterId,
        },
      });
    }
  }
}
