import { Ref } from "react";

export function mergeRefs<T>(...refs: Ref<T>[]): Ref<T> {
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
