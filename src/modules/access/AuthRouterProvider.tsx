import { Register, RouterProvider } from "@tanstack/react-router";
import { AuthState } from "./fetchAuthState";

export default function AuthRouterProvider({
  router,
  initialAuthState,
}: {
  router: Register["router"];
  initialAuthState: AuthState;
}) {
  return (
    <RouterProvider router={router} context={{ auth: initialAuthState }} />
  );
}
