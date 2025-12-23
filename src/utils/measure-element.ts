import { useCallback, useRef, useState } from "react";

export function useElementDimensions(): [
  (element: HTMLElement | null) => void,
  ResizeObserverSize,
] {
  const [size, setSize] = useState({ blockSize: 0, inlineSize: 0 });

  const observer = useRef(
    typeof window !== "undefined" ?
      new ResizeObserver((records) => {
        if (!records[0]) return;

        setSize(records[0].borderBoxSize[0]);
      })
    : null,
  );

  const el = useRef<HTMLElement | null>(null);
  const ref = useCallback(
    (element: HTMLElement | null) => {
      if (el.current === element) {
        return;
      }

      if (el.current) {
        observer.current?.unobserve(el.current);
      }

      if (element) {
        observer.current?.observe(element);
      } else {
        setSize({ blockSize: 0, inlineSize: 0 });
      }

      el.current = element;
    },
    [setSize],
  );

  return [ref, size];
}
