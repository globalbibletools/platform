import {
  parseChapterPermalinkReference,
  generateChapterPermalinkReference,
} from "@/verse-utils";
import { notFound, ParsedLocation, redirect } from "@tanstack/react-router";

const PERMALINK_PATHNAME_REGEX = /^\/p\/(\w+)\/(.+)$/;

export function generateChapterPermalinkUrl(chapterId: string) {
  const reference = generateChapterPermalinkReference(chapterId);
  return `${window.location.origin}/p/ref/${reference}`;
}

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
      } catch {
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
