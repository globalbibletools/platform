import { QueryClient, useQueryClient } from "@tanstack/react-query";
import { fetchAuthState } from "./fetchAuthState";

const authQuery = {
  queryKey: ["auth"],
  queryFn: () => fetchAuthState(),
};

export function initAuthState(queryClient: QueryClient) {
  return queryClient.ensureQueryData({
    ...authQuery,
    staleTime: Infinity,
  });
}

export function useAuthRefresh() {
  const queryClient = useQueryClient();

  return async () => {
    await queryClient.fetchQuery(authQuery);
  };
}
