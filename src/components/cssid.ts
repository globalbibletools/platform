import { useMemo } from 'react';

/**
 * Generates a ID to use in generic components with a reasonable guarantee of uniqueness.
 * This ID can also be used as a prefix for the IDs of elements within the component.
 * @param scope The prefix to add to the ID for readability.
 * @returns A string in the form `scope-a2fc23`
 */
export default function useCssId(scope: string): string {
  return useMemo(() => {
    const rand = Math.floor(Math.random() * 16777216).toString(16);
    if (scope) return `${scope}-${rand}`;
    else return rand;
  }, [scope]);
}

