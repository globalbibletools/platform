import { ForwardedRef, MutableRefObject, RefCallback } from "react";

export function mergeRefs<T>(...refs: (RefCallback<T> | MutableRefObject<T> | ForwardedRef<T>)[]) {
  return (instance: T) => {
    refs.forEach((ref) => {
      if (typeof ref === "function") {
        ref(instance);
      } else if (ref != null) {
        ref.current = instance;
      }
    });
  };
}
