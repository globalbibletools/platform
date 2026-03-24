import { useCallback, useRef, useState } from "react";

export function useElementDimensions(): [
  (element: HTMLElement | null) => void,
  ResizeObserverSize,
] {
  const [size, setSize] = useState({ blockSize: 0, inlineSize: 0 });

  const observerRef = useRef(
    typeof window !== "undefined" ?
      new ResizeObserver((records) => {
        if (!records[0]) return;

        setSize(records[0].borderBoxSize[0]);
      })
    : null,
  );

  const elementRef = useRef<HTMLElement | null>(null);
  const ref = useCallback(
    (element: HTMLElement | null) => {
      if (elementRef.current === element) {
        return;
      }

      if (elementRef.current) {
        observerRef.current?.unobserve(elementRef.current);
      }

      if (element) {
        observerRef.current?.observe(element);
      } else {
        setSize({ blockSize: 0, inlineSize: 0 });
      }

      elementRef.current = element;
    },
    [setSize],
  );

  return [ref, size];
}
