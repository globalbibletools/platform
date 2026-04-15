import { useLayoutEffect, useRef, useState } from "react";

export interface UseTextWidthOptions {
  /** The text to measure */
  text: string;
  /** The font family to measure the text in. */
  fontFamily: string;
  /** The font size to measure the text in. */
  fontSize: string;
}

/**
 * Calculate the width of some text.
 * @returns The width of the text, in pixels.
 */
export function useTextWidth(options: UseTextWidthOptions): number {
  const measureElementRef = useRef<HTMLDivElement | undefined>(undefined);

  useLayoutEffect(() => {
    const div = document.createElement("div");
    div.style.width = "auto";
    div.style.height = "0";
    div.style.maxHeight = "0";
    div.style.visibility = "hidden";
    div.style.position = "absolute";
    // This seems hacky, but it gets the elements completely off the screen, so
    // that they don't affect the scroll bar.
    div.style.top = "-9999px";
    div.style.left = "-9999px";
    document.body.appendChild(div);
    measureElementRef.current = div;
    return () => div.remove();
  }, []);

  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    if (measureElementRef.current) {
      measureElementRef.current.style.fontFamily = options.fontFamily;
      measureElementRef.current.style.fontSize = options.fontSize;
      // Replace spaces with a non breaking space to ensure trailing spaces are measured
      measureElementRef.current.innerText = options.text.replace(
        / /g,
        "\u00A0",
      );
      setWidth(measureElementRef.current.clientWidth);
    }
  }, [options]);

  return width;
}
