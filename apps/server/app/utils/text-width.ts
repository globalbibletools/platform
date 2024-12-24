import { useLayoutEffect, useRef, useState } from 'react';

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
  const el = useRef<HTMLDivElement>();

  useLayoutEffect(() => {
    const div = document.createElement('div');
    div.style.width = 'auto';
    div.style.height = '0';
    div.style.maxHeight = '0';
    div.style.visibility = 'hidden';
    div.style.position = 'absolute';
    // This seems hacky, but it gets the elements completely off the screen, so
    // that they don't affect the scroll bar.
    div.style.top = '-9999px';
    div.style.left = '-9999px';
    document.body.appendChild(div);
    el.current = div;
    return () => div.remove();
  }, []);

  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    if (el.current) {
      el.current.style.fontFamily = options.fontFamily;
      el.current.style.fontSize = options.fontSize;
      el.current.innerText = options.text;
      setWidth(el.current.clientWidth);
    }
  }, [options]);

  return width;
}

