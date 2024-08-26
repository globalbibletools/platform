"use client";
import { ReactNode, useActionState, createContext, useContext } from "react";
import { useFormState } from "react-dom";

export const ProfileFormContext = createContext<
  [any, () => void, boolean] | undefined
>(undefined);

export default function ProfileFormContextProvider({ children }: any) {
  const value = useFormState<any>((s) => s, {});
  return (
    <ProfileFormContext.Provider value={value}>
      {children}
    </ProfileFormContext.Provider>
  );
}
export function useProfileFormContext() {
  return useContext(ProfileFormContext);
}
// export default function ProfileForm({
//   children,
//   user,
// }: {
//   children: ReactNode;
//   user: any;
// }) {
//   async function onSubmit(state: any) {
//     try {
//       if (user) {
//         await query(
//           `UPDATE "User"
//                 SET "email" = $1,
//                     "name" = $2,
//                     "password" = $3
//               WHERE "id" = $4`,
//           [state.email, state.name, state.password, user.id]
//         );
//       }

//       //   flash.success(t("users:profile_updated"));
//     } catch (error) {
//       //   flash.error(`${error}`);
//     }

//     return { ...state, password: "", confirmPassword: "" };
//   }
//   const [state, formAction] = useActionState<
//     {
//       email?: string;
//       name?: string;
//       password?: string;
//       confirmPassword?: string;
//     } & any
//   >(onSubmit, {});

//   return (
//     <form action={formAction}>
//       <ProfileFormContextProvider value={state}>
//         {children}
//       </ProfileFormContextProvider>
//     </form>
//   );
// }
