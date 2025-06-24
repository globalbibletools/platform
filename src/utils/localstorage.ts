import { Dispatch, SetStateAction, useEffect, useState } from "react";

export default function useLocalStorageState(item: string): [number, Dispatch<SetStateAction<number>>] {
  // Fetch the textSize from local storage, if we're in a browser context
  const getInitialTextSize = (): number => {
    if (typeof window === "undefined" || typeof localStorage === "undefined") {
      return 3;
    }

    const stored = parseInt(localStorage.getItem(item) ?? "", 10);
    return Number.isNaN(stored) ? 3 : stored;
  };

  // Persist the textSize in localStorage on update
  const [textSize, setTextSize] = useState<number>(getInitialTextSize);
  useEffect(() => {
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      localStorage.setItem(item, textSize.toString());
    }
  }, [textSize]);

  return [textSize, setTextSize];
}
